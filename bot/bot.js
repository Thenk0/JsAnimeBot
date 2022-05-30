const Config = require("../config");
const Discord = require("discord.js");
const Embeds = require("./embeds");
const StringSimilarity = require("string-similarity");
const chalk = require("chalk");
const Voice = require("@discordjs/voice");
const path = require("path");
const fs = require('fs');
const play = require("play-dl");
const opsys = process.platform;
let dir;
switch (opsys) {
    case "win32":
    case "win64":
    case "darwin":
        dir = "./logs";
        break;
    case "linux":
        dir = "/var/log";
        break;
    default:
        dir = "./logs";
        break;
}

class Bot {
    constructor(webscraper, animeDB, checkFunction) {
        this.followProcess = false;
        this.unfollowProcess = false;
        this.dubPick = false;
        this.animeFollowObj = {};
        this.animeUnFollowObj = {};
        this.prefix = "!";
        this.webScraper = webscraper;
        this.animeDB = animeDB;
        this.client = new Discord.Client({
            intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES"]
        });
        this.client.login(Config.BOT_TOKEN);
        this.checkFunction = checkFunction;
        this.checkID = 0;
        this.lock = false;
        this.pause = false;
        this.musicQueue = [];
        this.currentTrack = {};
        this.pausedAt = 0;
        this.musicPlayer = Voice.createAudioPlayer({
            behaviors: {
                noSubscriber: Voice.NoSubscriberBehavior.Play
            }
        });
    }

    setCommands(client) {
        client.on("messageCreate", (message) => {
            if (message.author.bot) return;
            if (message.channel.id === Config.GENERAL_CHANNEL_ID) {
                if (message.content.toLowerCase().includes("го в борду")) return message.reply("Иди нахуй");
            }
            if (!message.content.startsWith(this.prefix)) return;
            const commandBody = message.content.slice(this.prefix.length);
            const args = commandBody.split(' ');
            const command = args.shift().toLowerCase();
            console.log(chalk.green(`${Embeds.formatedDate()}: Bot) Recieved command ${command}`));
            if (message.channelId === Config.MUSIC_CHANNEL_ID) {
                this.handleMusicCommands(args, command, message);
                return;
            }
            if (message.channel.id === Config.COMMAND_CHANNEL_ID) {
                this.handleCommand(args, command, message);
                return;
            }
            if (message.channel.id === Config.GENERAL_CHANNEL_ID) {
                this.handleMemeComands(args, command, message);
                return;
            }
        });
    }

    async handleMusicCommands(args, command, message) {
        const VC = message.member.voice.channel;
        if (!VC) return message.reply({
            embeds: [Embeds.error("Отправитель не в голосовом канале", "music")]
        });
        const con = Voice.getVoiceConnection(message.guild.id);
        if (typeof con !== "undefined") {
            if (message.member.voice.channel !== message.guild.me.voice.channel) return message.reply({
                embeds: [Embeds.error("Бот принимает команды, только если вы находитесь с ним в одном канале.", command)],
            });
        }
        switch (command) {
            case "pause":
                if (this.pause) {
                    return message.reply({
                        embeds: [Embeds.error("Пауза уже включена", command)]
                    })
                }
                this.pausedAt = new Date().getTime();
                this.musicPlayer.pause();
                this.pause = true;
                message.reply({
                    embeds: [Embeds.success("Пауза включена", command)]
                })
                break;
            case "unpause":
                if (!this.pause) {
                    return message.reply({
                        embeds: [Embeds.error("Трек не на паузе", command)]
                    })
                }
                this.musicPlayer.unpause();
                const currentDate = new Date().getTime()
                const difference = currentDate - this.pausedAt;
                this.currentTrack.startedAt += difference;
                this.pause = false;
                message.reply({
                    embeds: [Embeds.success("Пауза выключена", command)]
                })
                break;
            case "quit":
            case "stop":
                this.stopmusic(message, message.guild.id);
                message.reply({
                    embeds: [Embeds.success("Воспроизвездение успешно остановлено", command)]
                })
                break;
            case "q":
            case "queue":
                if (this.musicQueue.length == 0) {
                    return message.reply({
                        embeds: [Embeds.success("Очередь пуста", command)]
                    })
                }
                message.reply({
                    embeds: Embeds.queue(this.musicQueue)
                })
                break;
            case "skip":
            case "next":
                this.nextSong(message, command);
                break;
            case "c":
            case "с": // Russian fix
            case "current":
            case "track":
            case "now":
                if (this.pause) {
                    return message.reply({
                        embeds: [Embeds.error("Трек на паузе", command)]
                    })
                }
                if (Object.keys(this.currentTrack).length === 0) {
                    return message.reply({
                        embeds: [Embeds.error("Нет текущего трека", command)]
                    })
                }
                await Embeds.canvas(message, this.currentTrack);
                break;
            case "song":
            case "add":
            case "play":
                this.playyt(VC, args, message.guild.id, message);
                break;
            case "help":
                message.reply(
                    '```\n' +
                    '!help - Выводит это сообщение\n\n' +
                    '!play|!song|!add <search> - Ищет на youtube параметр search и воспроизводит аудио, если аудио в прогрессе, добавляет его в очередь\n\n' +
                    '!queue|!q - Выводит информацию об очереди песен\n\n' +
                    '!next|!skip - Пропускает текущий трек\n\n' +
                    '!c|!current|!track|!now - Выводит текущий трек\n\n' +
                    '!pause - Ставит воспроизведение на паузу\n\n' +
                    '!unpause - Убирает воспроизведение с паузы\n\n' +
                    '!stop - Останавливает музыкального бота, опустошая очередь\n\n' +
                    '```'
                );
                break;
            default:
                const commands = [
                    "help", "play", "song", "add", "queue", "q", "next", "skip", "c", "current", "track", "now", "pause", "unpause", "stop"
                ];
                this.notRecognized(message, command, commands);
                break;
        }
    }

    handleMemeComands(args, command, message) {
        const VC = message.member.voice.channel;;
        switch (command) {
            case "unsub":
                this.animeDB.unsubUser(message.member.id);
                message.reply({
                    embeds: [Embeds.success(`При заходе на канал больше не будут проигрываться звуки`, "unsub")]
                });
                break;
            case "sub":
                this.animeDB.subUser(message.member.id);
                message.reply({
                    embeds: [Embeds.success(`При заходе на канал будут проигрываться звуки`, "sub")]
                });
                break;
            case "sex":
                if (this.lock) {
                    message.delete();
                    return message.channel.send({
                        embeds: [Embeds.error("Бот не может принимать команды в данный момент", "??????")]
                    });
                }
                if (!VC) {
                    message.delete();
                    return message.channel.send({
                        embeds: [Embeds.error("Отправитель не в голосовом канале", "??????")]
                    });
                }
                this.playsound(VC, "sex.mp3");
                message.delete();
                break;
            case "augh":
                if (this.lock) {
                    message.delete();
                    return message.channel.send({
                        embeds: [Embeds.error("Бот не может принимать команды в данный момент", "??????")]
                    });
                }
                if (!VC) {
                    message.delete();
                    return message.channel.send({
                        embeds: [Embeds.error("Отправитель не в голосовом канале", "??????")]
                    });
                }
                this.playsound(VC, "augh.mp3");
                message.delete();
                break;
            case "toob":
                if (this.lock) {
                    message.delete();
                    return message.channel.send({
                        embeds: [Embeds.error("Бот не может принимать команды в данный момент", "??????")]
                    });
                }
                if (!VC) {
                    message.delete();
                    return message.channel.send({
                        embeds: [Embeds.error("Отправитель не в голосовом канале", "??????")]
                    });
                }
                this.playsound(VC, "toob.mp3");
                message.delete();
                break;
            case "super_awa":
                if (this.lock) {
                    message.delete();
                    return message.channel.send({
                        embeds: [Embeds.error("Бот не может принимать команды в данный момент", "??????")]
                    });
                }
                if (!VC) {
                    message.delete();
                    return message.channel.send({
                        embeds: [Embeds.error("Отправитель не в голосовом канале", "??????")]
                    });
                }
                this.playsound(VC, "super_awa.mp3");
                message.delete();
                break;
            case "gnome":
                if (this.lock) {
                    message.delete();
                    return message.channel.send({
                        embeds: [Embeds.error("Бот не может принимать команды в данный момент", "??????")]
                    });
                }
                if (!VC) {
                    message.delete();
                    return message.channel.send({
                        embeds: [Embeds.error("Отправитель не в голосовом канале", "??????")]
                    });
                }
                this.playsound(VC, "gnome.mp3");
                message.delete();
                break;
            case "bruh":
                message.delete();
                message.channel.send(`https://media.rawg.io/media/resize/1280/-/screenshots/fa0/fa09b6849a915df4f9e01086b6f9f9d3.jpg`);
                break;
            case "summon":
                message.delete();
                const user = message.guild.members.cache.find(user => user.user.username == args[0]);
                if (typeof user === "undefined") return message.channel.send("Пользователь не найден");
                if (!user.roles.cache.some(role => role.name == "Jefors")) return message.channel.send("Cannot summon unworthy");
                user.send("https://media.discordapp.net/attachments/971320408693432320/971353905852207154/test.png?width=1202&height=676");
                message.channel.send(`I summon thee <@${user.id}>`);
                break;
            default:
                break;
        }
    }

    handleCommand(args, command, message) {
        let VC;
        switch (command) {
            case "awawawa":
                if (this.lock) return message.reply({
                    embeds: [Embeds.error("Бот не может принимать команды в данный момент", "awawawa")]
                });
                VC = message.member.voice.channel;
                if (!VC) return message.reply({
                    embeds: [Embeds.error("Отправитель не в голосовом канале", "awawawa")]
                });
                this.playsound(VC, "waw.mp3");
                break;

            case "forceupdate":
                if (this.checkID == 0) return message.reply(`Проверка еще не запущена`);
                clearInterval(this.checkID);
                this.forceUpdate(message);
                break;
            case "follow":
                if (args.length < 1) {
                    message.reply({
                        embeds: [Embeds.error(`Нет параметра [<ID>], !follow [<ID>]`, `follow`)]
                    });
                    return;
                }
                if (this.followProcess) {
                    message.reply({
                        embeds: [Embeds.error(`Процесс подписки уже запущен!\nОстановить его можно с помощью команды [!abort]`, `follow ${args[0]}`)]
                    });
                    return;
                }
                this.follow(args, message);
                break;
            case "confirm":
                if (!this.followProcess && !this.unfollowProcess) {
                    message.reply({
                        embeds: [Embeds.error(`Подтверждать нечего`, `confirm`)]
                    });
                    return;
                }

                if ((this.dubPick || this.unfollowProcess) && args.length === 0) {
                    message.reply({
                        embeds: [Embeds.error(`Нет параметра [<URI>].\n` +
                            `Во время выбора озвучки команда ожидает 1 параметр\n` +
                            `!confirm [<n>]`, `confirm`)]
                    });
                    return;
                }
                if ((this.dubPick || this.unfollowProcess) && args.length > 1) {
                    message.reply({
                        embeds: [Embeds.error(`!confirm [${args.join(" ")}]\n` +
                            `Слишком много параметров!\n` +
                            `Команда принимает только 1 параметр [<n>]`, `confirm ${args.join(" ")}`)]
                    });
                    return;
                }
                if (this.dubPick) return this.pickDub(args, message)
                if (this.unfollowProcess) return this.unfollowDub(args, message);
                if (!this.dubPick && args.length !== 0) {
                    message.reply({
                        embeds: [Embeds.error(`!confirm [${args.join(" ")}]\n` +
                            `Слишком много параметров!\n` +
                            `В процессе подписки команда не принимает параметров`, `confirm ${args.join(" ")}`)]
                    });
                    return;
                }

                if (!this.dubPick) {
                    message.reply({
                        embeds: [Embeds.success(`Запрашиваем сайт на информацию об озвучках. Пожалуйста подождите...`, "confirm")]
                    });
                    this.getAnimeInfo(message);
                    return;
                }
                break;
            case "changeurl":
                if (!this.followProcess) {
                    message.reply(`Exception: Not implemented`);
                    return;
                }
                if (args.length < 1) {
                    message.reply({
                        embeds: [Embeds.error(`Нет параметра [<URI>].\n` +
                            `В процессе подписки команда ожидает 1 параметр\n` +
                            `!changeurl [<URI>]`, `changeurl`)]
                    });
                    return;
                }
                if (args.length > 1) {
                    message.reply({
                        embeds: [Embeds.error(`!changeurl [${args.join(" ")}]\n` +
                            `Слишком много параметров!\n` +
                            `Команда принимает только 1 параметр [<URI>]`, `changeurl ${args.join(" ")}`)]
                    });
                    return;
                }
                this.changeUrl(args, message);
                break;
            case "abort":
                if (!this.followProcess && !this.unfollowProcess) {
                    message.reply({
                        embeds: [Embeds.error(`Останавливать нечего`, `abort`)]
                    });
                    return;
                }
                this.abort(message);
                break;
            case "unfollow":
                if (args.length < 1) {
                    message.reply({
                        embeds: [Embeds.error(`Нет параметра [<ID>], !unfollow [<ID>]`, `unfollow`)]
                    });
                    return;
                }
                if (this.unfollowProcess) {
                    message.reply({
                        embeds: [Embeds.error(`Процесс отписки уже запущен!\nОстановить его можно с помощью команды [!abort]`, `unfollow ${args[0]}`)]
                    });
                    return;
                }
                this.unfollow(args, message);
                break;
            case "getfollow":
                if (args.length < 1) {
                    message.reply({
                        embeds: [Embeds.error(`Нет параметра [<ID>], !getfollow [<ID>]`, `getfollow`)]
                    });
                    return;
                }
                this.getfollow(message, args);
                break;
            case "getfollows":
                this.getfollows(message);
                break;
            case "getcheck":
                this.getcheck(message);
                break;
            case "getlist":
                this.getlist(message);
                break;
            case "help":
                this.help(message);
                break;
            default:
                const commands = [
                    "forceUpdate",
                    "getlist",
                    "getfollows",
                    "follow",
                    "changeurl",
                    "confirm",
                    "abort",
                    "getcheck",
                    "unfollow",
                    "getdubs",
                    "help",
                    "awawawa"
                ];
                this.notRecognized(message, command, commands);
                break;
        }
    }

    notRecognized(message, command, commands) {
        const matches = StringSimilarity.findBestMatch(command, commands);
        if (matches.bestMatch.rating > 0.4) {
            message.reply({
                embeds: [
                    Embeds.error(
                        `Команда "[!${command}]" не распознана\nВозможно, вы имели ввиду: "!${matches.bestMatch.target}"?`,
                        command)
                ]
            });
            return;
        }
        message.reply({
            embeds: [Embeds.error(`Команда "[!${command}]" не распознана`, command)]
        });
    }

    stopmusic(message, guildId) {
        const con = Voice.getVoiceConnection(guildId);
        if (typeof con === "undefined") return;
        this.musicQueue = [];
        con.destroy();
        this.musicPlayer.stop();
        this.currentTrack = {};
        this.musicPlayer.removeAllListeners();
        this.lock = false;
    }

    async nextSong(message, command) {
        if (this.musicQueue.length == 0) return message.reply({
            embeds: [Embeds.error("Очередь пуста", command)]
        });
        await message.reply({
            embeds: [Embeds.success("Пропускаем текущую песню", command)]
        })
        let trynext = true;
        while (trynext) {
            const nextSong = this.musicQueue.shift();
            try {
                await message.channel.send({
                    embeds: [Embeds.currentTrack(nextSong)]
                });
                const stream = await play.stream(nextSong.url);
                const resource = Voice.createAudioResource(stream.stream, {
                    inputType: stream.type
                });
                console.log(chalk.green(`${Embeds.formatedDate()}: Bot) Playing audio ${nextSong.title}`));
                this.musicPlayer.play(resource);
                this.currentTrack = nextSong;
                trynext = false;
            } catch (error) {
                if (this.musicQueue.length == 0) trynext = false;
                console.log(chalk.red(`WARN | ${Embeds.formatedDate()}: Bot) Audio ${nextSong.title} is unavailable`));
                message.channel.send({
                    embeds: [Embeds.error(`Видео "${nextSong.title}" недоступно`, "play")]
                });
            }
        }
    }

    async playyt(VC, search, guildId, message) {
        this.lock = true;
        search = search.join(" ");
        const con = Voice.getVoiceConnection(guildId);
        if (typeof con !== "undefined") {
            const yt_info = await play.search(search, {
                limit: 1
            })
            if (yt_info.length == 0) {
                return message.reply({
                    embeds: [Embeds.error("Видео не было найдено", "play")]
                });
            }
            this.musicQueue.push({
                url: yt_info[0].url,
                title: yt_info[0].title,
                thumbnail: yt_info[0].thumbnails[0].url,
                length: yt_info[0].durationInSec,
            });
            return message.reply({
                embeds: [Embeds.foundtrack(yt_info[0])]
            });
        }
        const connection = Voice.joinVoiceChannel({
            channelId: VC.id,
            guildId: VC.guild.id,
            adapterCreator: VC.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false
        });

        connection.subscribe(this.musicPlayer);
        const self = this;
        this.musicPlayer.on(Voice.AudioPlayerStatus.Playing, status => {
            if (!self.currentTrack.started) {
                const date = new Date();
                self.currentTrack.startedAt = date.getTime();
                self.currentTrack.started = true;
            }
            console.log(chalk.green(`${Embeds.formatedDate()}: Bot) Begin playing track`));
        });
        this.musicPlayer.on("error", error => {
            console.error(chalk.red(`${Embeds.formatedDate()}: Bot) Audio failed ${error.message}`));
            fs.appendFileSync(dir + "/animebot_error.log", `ERROR| ${Embeds.formatedDate()}: Bot) Audio failed ${error}\n`);
        });

        connection.on(Voice.VoiceConnectionStatus.Ready, async () => {
            console.log(chalk.green(`${Embeds.formatedDate()}: Bot) Ready to play audio`));
            const yt_info = await play.search(search, {
                limit: 1
            });
            if (yt_info.length == 0) {
                connection.destroy();
                return message.reply({
                    embeds: [Embeds.error("Видео не было найдено", "play")]
                });
            };
            message.reply({
                embeds: [Embeds.foundtrack(yt_info[0])]
            });
            const currentTrack = yt_info[0].title;
            this.currentTrack = {
                url: yt_info[0].url,
                title: yt_info[0].title,
                thumbnail: yt_info[0].thumbnails[0].url,
                length: yt_info[0].durationInSec
            };
            try {
                const stream = await play.stream(yt_info[0].url);
                await message.channel.send({
                    embeds: [Embeds.currentTrack({
                        url: yt_info[0].url,
                        title: yt_info[0].title,
                        thumbnail: yt_info[0].thumbnails[0].url
                    })]
                });
                const resource = Voice.createAudioResource(stream.stream, {
                    inputType: stream.type
                });
                this.musicPlayer.play(resource);
                console.log(chalk.green(`${Embeds.formatedDate()}: Bot) Playing audio ${currentTrack}`));
            } catch (error) {
                console.log(chalk.red(`WARN | ${Embeds.formatedDate()}: Bot) Audio is unavailable`));
                message.channel.send({
                    embeds: [Embeds.error(`Видео "${currentTrack}" недоступно`, "play")]
                });
                this.musicPlayer.stop();
                this.musicPlayer.removeAllListeners();
                const con = Voice.getVoiceConnection(guildId);
                if (typeof con !== "undefined") con.destroy();
                this.lock = false;
            }
        });

        this.musicPlayer.on(Voice.AudioPlayerStatus.Idle, async () => {
            if (this.musicQueue.length == 0) {
                const con = Voice.getVoiceConnection(guildId);
                if (typeof con !== "undefined") con.destroy();
                this.musicPlayer.stop();
                this.musicPlayer.removeAllListeners();
                this.currentTrack = {};
                this.lock = false;
                return;
            }
            let trynext = true;
            while (trynext) {
                const nextSong = this.musicQueue.shift();
                let currentTrack = nextSong.title;
                message.channel.send({
                    embeds: [Embeds.currentTrack(nextSong)]
                });
                try {
                    const stream = await play.stream(nextSong.url);
                    const resource = Voice.createAudioResource(stream.stream, {
                        inputType: stream.type
                    });
                    console.log(chalk.green(`${Embeds.formatedDate()}: Bot) Playing audio ${currentTrack}`));
                    this.musicPlayer.play(resource);
                    this.currentTrack = nextSong;
                    trynext = false;
                } catch (error) {
                    if (this.musicQueue.length == 0) {
                        const con = Voice.getVoiceConnection(guildId);
                        if (typeof con !== "undefined") con.destroy();
                        this.musicPlayer.stop();
                        this.musicPlayer.removeAllListeners();
                        this.currentTrack = {};
                        this.lock = false;
                        trynext = false;
                    }
                    console.log(chalk.red(`WARN | ${Embeds.formatedDate()}: Bot) Audio ${currentTrack} is unavailable`));
                    message.channel.send({
                        embeds: [Embeds.error(`Видео "${currentTrack}" недоступно`, "play")]
                    });
                }
            }
        })
    }

    async playsound(VC, filename) {
        if (this.lock) return;
        const con = Voice.getVoiceConnection(VC.guild.id);
        if (typeof con !== "undefined") con.destroy();
        this.lock = true;
        const connection = Voice.joinVoiceChannel({
            channelId: VC.id,
            guildId: VC.guild.id,
            adapterCreator: VC.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false
        });
        const player = Voice.createAudioPlayer();
        connection.subscribe(player);
        player.on(Voice.AudioPlayerStatus.Playing, () => {
            console.log(chalk.green(`${Embeds.formatedDate()}: Bot) Playing audio ${filename}`));
        });
        player.on("error", error => {
            console.error(chalk.red(`${Embeds.formatedDate()}: Bot) Audio failed ${error.message}`));
            fs.appendFileSync(dir + "/animebot_error.log", `ERROR| ${Embeds.formatedDate()}: Bot) Audio failed ${error}\n`);
        });
        connection.on(Voice.VoiceConnectionStatus.Ready, () => {
            console.log(chalk.green(`${Embeds.formatedDate()}: Bot) Ready to play audio`));
            const resource = Voice.createAudioResource(path.join(__dirname, "..", "audio", filename));
            player.play(resource);
        });
        player.on(Voice.AudioPlayerStatus.Idle, () => {
            const con = Voice.getVoiceConnection(VC.guild.id);
            if (typeof con !== "undefined") con.destroy();
            this.lock = false;
        })
    }

    async forceUpdate(message) {
        await this.checkFunction();
        this.checkID = setInterval(() => {
            this.checkFunction();
        }, 3600000);
        message.reply("Проверка проведена, таймер перезапущен");
    }

    async follow(args, message) {
        const name = args.join(" ");
        const guess = this.animeDB.getSimilar(name);
        let id = parseInt(args[0]);
        if (guess != null) id = guess.animeID;
        if (!this.animeDB.isAnimeInDBCached(id)) return message.reply({
            embeds: [Embeds.error(`Аниме с таким [ID] не существует в бд`, `follow ${name}`)]
        });
        this.followProcess = true;
        this.animeFollowObj.id = id;
        this.animeFollowObj.url = id;
        // check if was followed before
        const followObj = this.animeDB.getFollowedAnimeCached(id);
        if (typeof followObj !== "undefined") {
            this.animeFollowObj.title = followObj.animeName;
            message.reply({
                embeds: [Embeds.success(`На аниме уже есть подписка, шаг пропущен\nЗапрашиваем сайт на информацию об озвучках. Пожалуйста подождите...`, "follow")]
            });
            return this.getAnimeInfo(message);
        }
        let info;
        await this.webScraper.initialize();
        try {
            info = await this.webScraper.getAnimeInfoByID(id);
        } catch (error) {
            console.warn(chalk.bold.redBright(`Warning! ${Embeds.formatedDate()}: WebScraper) Get anime info failed! For more information check error.log`));
            message.reply({
                embeds: [Embeds.error(`[Ошибка], Webscraper упал во время запроса`, `follow ${name}`)]
            });
            fs.appendFileSync(dir + "/animebot_error.log", `WARN| ${Embeds.formatedDate()}: WebScraper) GetAnimeInfoByID has failed!; ${error}\n`);
            return await webScraperChecker.close();

        }
        if (info == 404) {
            message.reply({
                embeds: [Embeds.error(`[404], аниме по этой ссылке не найдено`, `follow ${name}`)]
            });
            return await webScraperChecker.close();

        }
        await this.webScraper.close();
        info.episodes = this.animeDB.getAnimeCached(id).currentEpisodes;
        info.url = this.animeFollowObj.url;
        this.animeFollowObj.title = info.title;
        message.reply({
            embeds: [Embeds.follow(info)]
        });
    }

    unfollow(args, message) {
        const name = args.join(" ");
        const guess = this.animeDB.getSimilar(name);
        let id = parseInt(args[0]);
        if (guess != null) id = guess.animeID;
        if (!this.animeDB.isAnimeInDBCached(id)) {
            message.reply({
                embeds: [Embeds.error(`Аниме с таким [ID] не существует в бд`, `confirm ${name}`)]
            });
            return;
        }
        this.animeUnFollowObj = this.animeDB.getFollowedAnimeCached(id);
        if (typeof this.animeUnFollowObj === "undefined") {
            message.reply({
                embeds: [Embeds.error(`Аниме не отслеживается`, `confirm ${name}`)]
            });
            this.animeUnFollowObj = {};
            return;
        }
        if (this.animeUnFollowObj.dubs.length < 2) {
            this.animeDB.unfollow(this.animeUnFollowObj.animeID);
            message.reply({
                embeds: [Embeds.success(`Отписка от: ${this.animeUnFollowObj.animeName} оформлена успешно`, "unfollow")]
            });
            this.animeUnFollowObj = {};
            return;
        }

        this.unfollowProcess = true;
        message.reply({
            embeds: [Embeds.unfollowdubs(this.animeUnFollowObj, this.animeUnFollowObj.dubs)]
        });
    }

    unfollowDub(args, message) {
        const pick = parseInt(args[0]);
        if (pick == 0) {
            this.animeDB.unfollow(this.animeUnFollowObj.animeID);
            message.reply({
                embeds: [Embeds.success(`Отписка от: ${this.animeUnFollowObj.animeName} оформлена успешно`, "unfollow")]
            });
            this.unfollowProcess = false;
            this.animeUnFollowObj = {};
            return;
        }
        const dubName = this.animeUnFollowObj.dubs[pick - 1].dubName;
        this.animeDB.unfollowDub(this.animeUnFollowObj.animeID, dubName);
        message.reply({
            embeds: [Embeds.success(`Отписка от: ${this.animeUnFollowObj.animeName}|${dubName} оформлена успешно`, "unfollow")]
        });
        this.unfollowProcess = false;
        this.animeUnFollowObj = {};
    }

    async getAnimeInfo(message) {
        this.dubPick = true;
        await this.webScraper.initialize();
        let dubs
        try {
            dubs = await this.webScraper.getDubEpisodes(this.animeFollowObj.url);
        } catch (error) {
            console.warn(chalk.bold.redBright(`Warning! ${Embeds.formatedDate()}: WebScraper) Get dub episodes failed! For more information check error.log`));
            message.reply({
                embeds: [Embeds.error(`[Ошибка], Webscraper упал во время запроса`, `confirm`)]
            });
            fs.appendFileSync(dir + "/animebot_error.log", `WARN| ${Embeds.formatedDate()}: WebScraper) GetDubEpisodes has failed!; ${error}\n`);
            return await webScraperChecker.close();
        }
        if (dubs == 404) {
            message.reply({
                embeds: [Embeds.error(`[404], аниме по этой ссылке не найдено`, `confirm`)]
            });
            return await webScraperChecker.close();
        }
        await this.webScraper.close();
        this.animeFollowObj.dubInfo = dubs;
        for (let i = 0; i < this.animeFollowObj.dubInfo.length; i++) {
            const dub = this.animeFollowObj.dubInfo[i];
            dub.isSubbed = this.animeDB.isSubbed(dub, this.animeFollowObj.id);
        }
        message.reply({
            embeds: [Embeds.dubs(this.animeFollowObj, dubs)]
        });
    }

    pickDub(args, message) {
        const n = parseInt(args[0]);
        const dubObj = this.animeFollowObj.dubInfo[n - 1];
        if (dubObj.isSubbed) {
            message.reply({
                embeds: [Embeds.error(`Подписка на эту озвучку уже оформлена`, `confirm ${n}`)]
            });
            return;
        }
        this.animeDB.cacheDubs(this.animeFollowObj.dubInfo);
        const dub = this.animeDB.getDubCached(dubObj.dubName);
        this.animeDB.setFollow(this.animeFollowObj.id, dub, this.animeFollowObj.url, dubObj.episodes);
        message.reply({
            embeds: [Embeds.success(`Вы выбрали озвучку ${dubObj.dubName}`, "confirm")]
        });
        this.followProcess = false;
        this.dubPick = false;
        this.animeFollowObj = {};
    }

    async changeUrl(args, message) {
        const id = args[0];
        this.animeFollowObj.url = id;
        this.webScraper.initialize();
        let info;
        try {
            info = await this.webScraper.getAnimeInfoByID(id);
        } catch (error) {
            console.warn(chalk.bold.redBright(`Warning! ${Embeds.formatedDate()}: WebScraper) Get anime info failed! For more information check error.log`));
            message.reply({
                embeds: [Embeds.error(`[Ошибка], Webscraper упал во время запроса`, `confirm ${id}`)]
            });
            console.warn(chalk.bold.redBright(`Warning! ${Embeds.formatedDate()}: WebScraper) Get anime info failed! For more information check error.log`));
            return await webScraperChecker.close();
        }
        if (info == 404) {
            message.reply({
                embeds: [Embeds.error(`[404], аниме по этой ссылке не найдено`, `confirm ${id}`)]
            });
            return await webScraperChecker.close();
        }
        this.webScraper.close();
        message.reply({
            embeds: [Embeds.follow(info)]
        });
    }

    help(message) {
        message.reply(
            '```css\n' +
            '!forceUpdate - Останавливает проверку по времени и запускает её снова\n\n' +
            '!getlist - Выводит список аниме и ID на шикимори\n\n' +
            '!getfollow <ID> - Выдает список подписок для отдельного тайтла\n\n' +
            '!getfollows - Выдает список отслеживаемых тайтлов и озвучек.\n\n' +
            '!getcheck - Выдает список проверяемых тайтлов.\n\n' +
            '!follow <ID> - Запускает процесс подписки, принимает как параметр <ID> аниме на шикимори.\n' +
            '\tВо время процесса Follow, все остальные команды заблокированы\n\n' +
            '!changeurl <ID> <URL> - Изменяет URL аниме на aniu для выбранного тайтла [Not Implemented]\n' +
            '\t!changeurl <URL> - В процессе follow изменяет URL аниме на aniu\n\n' +
            '!confirm - Подтвердить действие\n \tВ процессе follow принимает параметр <n> чтобы выбрать озвучку \n\n' +
            '!abort - Останавливает процесс follow\n\n' +
            '!unfollow <ID> - Выдает список озвучек отслеживаемых для этого тайтла и позволяет отписаться от них\n\n' +
            '!help - Выводит это сообщение\n\n' +
            '!awawawa - awawawa' +
            '```'
        );
    }

    getfollows(message) {
        const follows = this.animeDB.cachedFollows;
        if (!follows.length) return message.reply({
            embeds: [Embeds.error(`Список пуст`, `getfollows`)]
        });
        const embed = Embeds.followList(follows);
        message.reply({
            embeds: [embed]
        });
    }

    getlist(message) {
        const anime = this.animeDB.cachedAnime;
        if (!anime.length) return message.reply({
            embeds: [Embeds.error(`Список пуст`, `getlist`)]
        });
        const embeds = Embeds.list(anime);
        message.reply({
            embeds: embeds
        });
    }

    getfollow(message, args) {
        const name = args.join(" ");
        const guess = this.animeDB.getSimilar(name);
        let id = parseInt(args[0]);
        if (guess != null) id = guess.animeID;
        const anime = this.animeDB.getFollowedAnimeCached(id);
        if (typeof anime !== "undefined") {
            message.reply({
                embeds: [Embeds.getfollow(anime, guess != null)]
            });
            return;
        }
        message.reply({
            embeds: [Embeds.error(`На аниме с таким id нет подписки`, `getfollow ${name}`)]
        });
    }

    getcheck(message) {
        const follows = this.animeDB.cachedFollows;
        if (!follows.length) return message.reply({
            embeds: [Embeds.error(`Список пуст`, `getcheck`)]
        });
        const checkedfollows = follows.filter((follow) => {
            for (const dub of follow.dubs) {
                if (dub.episodes < follow.currentEpisodes) return true;
            }
            return false;
        })
        message.reply({
            embeds: [Embeds.followList(checkedfollows)]
        });
    }

    abort(message) {
        this.unfollowProcess = false;
        this.followProcess = false;
        this.dubPick = false;
        this.animeFollowObj = {};
        this.animeUnFollowObj = {};
        message.reply({
            embeds: [Embeds.success(`Команда отменена`, "abort")]
        });
    }

    isNumeric(str) {
        if (typeof str != "string") return false
        return !isNaN(str) && !isNaN(parseFloat(str))
    }
}

module.exports = Bot;