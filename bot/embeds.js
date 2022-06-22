const {
    MessageEmbed,
    Message
} = require('discord.js');
const axios = require("axios");
const Canvas = require('@napi-rs/canvas');
const Discord = require("discord.js");

class Embeds {

    static async canvas(message, currentTrack) {
        const background = new Canvas.Image();
        const imageFile = await axios(currentTrack.thumbnail, {
            responseType: 'arraybuffer'
        });
        background.src = Buffer.from(imageFile.data);
        const canvas = Canvas.createCanvas(background.width, background.height);
        const context = canvas.getContext('2d');
        context.drawImage(background, 0, 0, canvas.width, canvas.height);
        const grV = context.createLinearGradient(0, 0, 0, canvas.height);
        grV.addColorStop(0, 'rgba(0,0,0,0)');
        grV.addColorStop(1, '#000');
        context.fillStyle = grV;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = "20px serif";
        context.fillStyle = "#888888";
        const padding = 20;
        const videoLengthInpx = canvas.width - padding * 2;
        context.fillRect(padding, canvas.height - 30, videoLengthInpx, 5);
        context.fillStyle = "#FF0000";
        const start = currentTrack.startedAt;
        const end = currentTrack.startedAt + currentTrack.length * 1000;
        const videoProgress = new Date().getTime() - start;
        const progressPercent = (videoProgress / (end - start)) * 100;
        const progressInPx = (videoLengthInpx / 100) * progressPercent;
        context.fillRect(padding, canvas.height - 30, progressInPx, 5);
        context.fillStyle = "#FFFFFF";
        context.fillText("0:00", padding, canvas.height - 35);
        const parsedVideoLength = Embeds.parseSecondsToString(currentTrack.length);
        const parsedVideoProgress = Embeds.parseSecondsToString(Math.floor(videoProgress / 1000));
        const textSize = context.measureText(parsedVideoLength).width;
        const textProgessSize = context.measureText(parsedVideoProgress).width;
        context.fillText(parsedVideoLength, (canvas.width - padding) - textSize, canvas.height - 35);
        context.fillText(parsedVideoProgress, (canvas.width / 2) - textProgessSize / 2, canvas.height - 5);
        const attachment = new Discord.MessageAttachment(canvas.toBuffer(), 'bufferedfilename.png');
        const embed = new MessageEmbed()
            .setColor("#1F51FF")
            .setTitle('DJ Litminer')
            .setURL(currentTrack.url)
            .setDescription(`Текущий трек 🎵🎵🎵`)
            .setImage(`attachment://bufferedfilename.png`)
            .setTimestamp()
            .setFooter({
                text: "Текущий трек"
            });
        embed.addField("Название трека:", currentTrack.title);
        message.reply({
            embeds: [embed],
            files: [attachment]
        });
    }

    static parseSecondsToString(length) {
        const hours = Math.floor(length / (60 * 60));
        const minutes = Math.floor((length - (hours * 60 * 60)) / 60);
        const seconds = Math.floor((((length - (hours * 60 * 60))) - minutes * 60));
        const parsedHours = hours == "0" ? "" : `${hours}:`;
        const parsedMinutes =
            (hours == 0 ?
                minutes :
                minutes > "9" ?
                minutes : `0${minutes}`) + ":";
        const parsedSeconds = seconds > "9" ? seconds : `0${seconds}`;
        const parsedVideoLength = `${parsedHours}${parsedMinutes}${parsedSeconds}`;
        return parsedVideoLength;
    }

    static queue(queues) {
        let arrays = [];
        console.log(queues);
        const queueCopy = queues.filter(() => true);
        const size = 25;
        while (queueCopy.length > 0) arrays.push(queueCopy.splice(0, size));
        let embeds = [];
        arrays.forEach((queuePart, j) => {
            const embed = new MessageEmbed()
                .setColor("#7F00FF")
                .setTitle('DJ Litminer')
                .setDescription(`Очередь музыки ${j+1} 🎵🎵🎵`)
                .setTimestamp()
                .setFooter({
                    text: "Очередь от"
                });
            queuePart.forEach((song, i) => {
                embed.addField(`🎵 ${i+1}):`, `\`\`\`ini\n[${song.title}]\`\`\``);
            });
            embeds.push(embed);
        })
        return embeds;
    }

    static foundtrack(trackinfo) {
        const embed = new MessageEmbed()
            .setColor("#48D1CC")
            .setTitle('DJ Litminer')
            .setDescription('Найден трек 🎵🎵🎵')
            .setImage(trackinfo.thumbnails[0].url)
            .setURL(trackinfo.url)
            .setTimestamp()
            .setFooter({
                text: "Новый трек от"
            });
        embed.addField("Найдено видео", trackinfo.title);
        return embed;
    }

    static currentTrack(trackinfo) {
        const embed = new MessageEmbed()
            .setColor("#1F51FF")
            .setTitle('DJ Litminer')
            .setDescription('Текущий трек 🎵🎵🎵')
            .setImage(trackinfo.thumbnail)
            .setURL(trackinfo.url)
            .setTimestamp()
            .setFooter({
                text: "Текущий трек"
            });
        embed.addField("Название трека", trackinfo.title);
        return embed;
    }

    static success(response, command) {
        let strresponse = "```css\n";
        strresponse += `${response}\n`;
        strresponse += "```";
        const embed = new MessageEmbed()
            .setColor("#00FF00")
            .setTitle("Успех")
            .addField(
                `Команда _!${command}_ выполнена успешно`,
                strresponse
            );
        return embed;
    }

    static error(response, command) {
        let strresponse = "```css\n";
        strresponse += `${response}\n`;
        strresponse += "```";
        const embed = new MessageEmbed()
            .setColor("#FF0000")
            .setTitle("Ошибка")
            .addField(
                `Ошибка при выполнении команды _!${command}_`,
                strresponse
            );
        return embed;
    }

    static followList(follows) {
        const embed = new MessageEmbed()
            .setColor("#DC143C")
            .setTitle('Список подписок')
            .setDescription('Текущие подписки на аниме и информация о них')
            .setTimestamp()
            .setFooter({
                text: "Информация о подсписках"
            });

        follows.forEach(follow => {
            let dubInfo = "```ini\n";
            dubInfo += `ID: ${follow.animeID}\n`;
            dubInfo += `Серий: ${follow.currentEpisodes}/${follow.maxEpisodes == "0" ? "?" : follow.maxEpisodes}\n`;
            follow.dubs.forEach(dub => {
                const addQuotes = dub.episodes < follow.currentEpisodes;
                let episodeStr = `${dub.episodes} ${Embeds.episodeToString(dub.episodes)}`;
                if (addQuotes) episodeStr = `[${episodeStr}]`;
                dubInfo += `\t${dub.dubName}: ${episodeStr}\n`;
            });
            dubInfo += "```";
            embed.addField(follow.animeName, dubInfo);
        });
        return embed;
    }
    static getfollow(follow, guess = false) {
        const embed = new MessageEmbed()
            .setColor("#F11412")
            .setTitle('Информация о подписке')
            .setDescription('Информация о тайтле')
            .setImage(`https://shikimori.one${follow.animeImage}`)
            .setTimestamp()
            .setFooter({
                text: "Информация о тайтле"
            });

        let dubInfo = "```ini\n";
        dubInfo += `ID: ${follow.animeID}\n`;
        dubInfo += `Серий: ${follow.currentEpisodes}/${follow.maxEpisodes == "0" ? "?" : follow.maxEpisodes}\n`;
        follow.dubs.forEach(dub => {
            const addQuotes = dub.episodes < follow.currentEpisodes;
            let episodeStr = `${dub.episodes} ${Embeds.episodeToString(dub.episodes)}`;
            if (addQuotes) episodeStr = `[${episodeStr}]`;
            dubInfo += `\t${dub.dubName}: ${episodeStr}\n`;
        });
        dubInfo += "```";
        embed.addField(follow.animeName, dubInfo);
        if (guess) {
            embed.setFooter({
                text: "Это аниме было предположено."
            })
        }
        return embed;
    }

    static list(animes) {
        let arrays = [];
        const size = 25;
        const animesCopy = animes.filter(() => true);
        while (animesCopy.length > 0) arrays.push(animesCopy.splice(0, size));
        let embeds = [];
        arrays.forEach((array, i) => {
            const embed = new MessageEmbed()
                .setColor("#DC703C")
                .setTitle(`Список "Смотрю" на шикимори №${i+1}`)
                .setDescription('Аниме в списке и информация о них')
                .setTimestamp()
                .setFooter({
                    text: "Список 'Смотрю'"
                });

            array.forEach(anime => {
                let animeInfo = "```css\n";
                animeInfo += `ID: ${anime.animeID}\n`;
                animeInfo += `Подписка: ${anime.follow ? "Есть" : "Нет"}\n`;
                animeInfo += `Серий: ${anime.currentEpisodes}/${anime.maxEpisodes == "0" ? "?" : anime.maxEpisodes}\n`;
                animeInfo += "```";
                embed.addField(anime.animeName, animeInfo);
            });
            embeds.push(embed);
        })
        return embeds;
    }

    static follow(animeObj) {
        const embed = new MessageEmbed()
            .setColor("#FF5F1F")
            .setTitle('Результат поиска на aniu')
            .setURL(`https://aniu.ru/anime/${animeObj.url}`)
            .setDescription(`Найдено аниме: ${animeObj.title}`)
            .setFields({
                name: "Ссылки на аниме",
                value: `Aniu: https://aniu.ru/anime/${animeObj.url}\nShikimori: https://shikimori.one/animes/${animeObj.url}`,
            }, {
                name: "Команды",
                value: "```css\n" +
                    "[!confirm] - Подтвердить результат поиска\n" +
                    "[!changeurl <URI>] - Сменить ссылку\n" +
                    "[!abort] - Отменить команду```"
            })
            .setImage(animeObj.img)
            .setTimestamp()
            .setFooter({
                text: "Результат поиска от"
            });
        return embed;
    }
    static dubs(animeObj, dubs) {
        const embed = new MessageEmbed()
            .setColor("#FF5F1F")
            .setTitle(`Аниме: ${animeObj.title}`)
            .setDescription(`Найдено ${dubs.length} озвучек`)
            .setFooter({
                text: "Озвучки тайтла"
            });
        let dubString = "";
        let dubArr = [];
        dubs.forEach((dub, i) => {
            if ((i % 10) == 0 && i != 0) {
                dubArr.push(dubString);
                dubString = "";
            }
            if (dub.isSubbed) {
                dubString += `\u276F ~~${i+1}) ${dub.dubName}: ${dub.episodes} ${Embeds.episodeToString(dub.episodes)}~~\n`
                return;
            }
            dubString += `**${i+1}) ${dub.dubName}: __${dub.episodes} ${Embeds.episodeToString(dub.episodes)}__**\n`
        });
        dubArr.push(dubString);
        dubArr.forEach((dubstr, i) => {
            if (i == 0) return embed.addField(
                "Озвучки",
                dubstr
            );
            embed.addField(
                "\u200B",
                dubstr
            );
        });

        embed.addField(
            "Команды",
            "```css\n" +
            "[!confirm <N>] - Выбрать озвучку\n" +
            "[!abort] - Отменить команду```"
        );
        return embed;
    }
    static unfollowdubs(animeObj, dubs) {
        const embed = new MessageEmbed()
            .setColor("#E21F03")
            .setTitle(`Аниме: ${animeObj.animeName}`)
            .setDescription(`Найдено ${dubs.length} озвучек`)
            .setFooter({
                text: "Озвучки тайтла"
            });
        let dubString = `**0) Все: __${animeObj.currentEpisodes} ${Embeds.episodeToString(animeObj.currentEpisodes)}__**\n`;
        dubs.forEach((dub, i) => {
            dubString += `**${i+1}) ${dub.dubName}: __${dub.episodes} ${Embeds.episodeToString(dub.episodes)}__**\n`
        });
        embed.addField(
            "Озвучки",
            dubString
        );
        embed.addField(
            "Команды",
            "```css\n" +
            "[!confirm <N>] - Выбрать озвучку\n" +
            "[!abort] - Отменить команду```"
        );
        return embed;
    }

    static episodeNotification(animeObj, dubObj) {
        const embed = new MessageEmbed()
            .setColor("#0047AB")
            .setTitle('Новая серия!')
            .setURL(`https://aniu.ru/anime/${animeObj.animeURL}`)
            .setDescription(animeObj.animeName)
            .setFields({
                name: "Ссылки на аниме",
                value: `Aniu: https://aniu.ru/anime/${animeObj.animeURL}\nShikimori: https://shikimori.one/animes/${animeObj.animeID}`,
            }, {
                name: dubObj.dubName,
                value: `${dubObj.newEpisodeNum}-я серия`
            })
            .setImage(`https://shikimori.one${animeObj.animeImage}`)
            .setTimestamp()
            .setFooter({
                text: "Уведомление от"
            });

        return embed;
    }

    static newAnime(animeObj) {
        let titleName = animeObj.russian;
        if (titleName == "") {
            titleName = animeObj.name;
        }
        const embed = new MessageEmbed()
            .setColor("#54DEFD")
            .setTitle('Новое аниме в списке!')
            .setURL(`https://shikimori.one${animeObj.url}`)
            .setDescription(titleName + `\nhttps://shikimori.one${animeObj.url}`)
            .setImage(`https://shikimori.one${animeObj.image.original}`)
            .setTimestamp()
            .setFooter({
                text: "Уведомление от"
            });
        embed.addField(
            "ID",
            `${animeObj.id.toString()}`
        );
        embed.addField(
            "Статус",
            animeObj.status
        );
        embed.addField(
            "Серий",
            `${animeObj.episodes_aired}|${animeObj.episodes == "0" ? "?" : animeObj.episodes}`
        )
        return embed;
    }

    static episodeToString(episodes, uppercase = false) {
        episodes = episodes.toString();
        if (episodes.length > 1) {
            episodes = episodes.toString();
            episodes = episodes.slice(-2);
        }
        episodes = parseInt(episodes);
        const quo = Math.floor(episodes / 10);
        const rem = episodes % 10;
        if (quo != 1) {
            if (rem == 1) {
                return uppercase ? "Серия" : "серия";
            }
            if (rem > 0 && rem < 5) {
                return uppercase ? "Серии" : "серии";
            }
        }
        return uppercase ? "Серий" : "серий";
    }

    static formatedDate() {
        const date = new Date();
        return date.toLocaleString("ru-RU");
    }

    static formatedDateWithHourChange(hourAmount) {
        const oldDateObj = new Date();
        const newDateObj = new Date();
        newDateObj.setTime(oldDateObj.getTime() + (60 * 60 * 1000 * hourAmount));
        return newDateObj.toLocaleString("ru-RU");
    }

}

module.exports = Embeds;