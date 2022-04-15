const AnimeDB = require("./shikimoriapi/animedb");
const ShikimoriApi = require("./shikimoriapi/shikimoriapi");
const Config = require("./config");
const WebScraper = require("./webscraper/webscraper");
const Discord = require("discord.js");

const shikimoriApi = new ShikimoriApi();
const animeDB = new AnimeDB();
const client = new Discord.Client({
    intents: ["GUILDS", "GUILD_MESSAGES"]
});
const webScraperDiscord = new WebScraper();
const webScraperChecker = new WebScraper();
webScraperDiscord.initialize();
webScraperChecker.initialize();
client.login(Config.BOT_TOKEN);
const prefix = "!";

function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time)
    });
}
let followProcess = false;
let dubPick = false;
let animeFollowObj = {};
let infoChannel = {};
let commandChannel = {};
client.on("ready", async function () {
    console.log("Bot is ready");
    infoChannel = client.channels.cache.get(Config.INFO_CHANNEL_ID);
    commandChannel = client.channels.cache.get(Config.COMMAND_CHANNEL_ID);
    checkShikimoriWatchList().catch((err) => {
        console.log(err);
    });
});

let checkID = 0;

client.on("messageCreate", function (message) {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;
    if (message.channel.id !== Config.COMMAND_CHANNEL_ID) return;

    const commandBody = message.content.slice(prefix.length);
    const args = commandBody.split(' ');
    const command = args.shift().toLowerCase();

    if (command === "getfollowedids") {
        console.log("working");
        let idString = "";
        let counter = 1;
        animeDB.dbAnimeIDs.forEach(element => {
            idString = `${idString}\n${counter}): ${element}`;
            counter++;
        });
        message.reply(`${idString}\n`);
    }
    if (command === "lmoa") {
        message.reply(`https://media.rawg.io/media/resize/1280/-/screenshots/fa0/fa09b6849a915df4f9e01086b6f9f9d3.jpg`);
    }

    // Commands
    if (command === "forceupdate") {
        if (checkID == 0) {
            message.reply(`Проверка еще не запущена`);
            return;
        }
        clearInterval(checkID);
        (async () => {
            await checkShikimoriWatchList().catch((err) => {
                console.log(err);
            });
            checkID = setInterval(() => {
                checkShikimoriWatchList().catch((err) => {
                    console.log(err);
                });
            }, 3600000);
            message.reply("Проверка проведена, таймер перезапущен");
        })();
    }
    if (command === "follow") {
        if (args.length < 1) {
            message.reply(`Нет параметра <ID>, !follow <ID>`);
            return;
        }
        if (args.length > 1) {
            message.reply(`Слишком много параметров, команда принимает только 1 параметр <ID>`);
            return;
        }
        if (followProcess) {
            message.reply(`Процесс follow уже запущен, остановить его можно с помощью команды !abort`);
            return;
        }
        followProcess = true;
        (async () => {
            const timeBefore = Date.now();
            const id = args[0];
            animeFollowObj.id = id;
            animeFollowObj.url = id;
            let info = await webScraperDiscord.getAnimeInfoByID(id);
            if (info == 404) {
                message.reply(`404, ничего не найдено`);
                return;
            }
            const timeAfter = Date.now() - timeBefore;
            let response = `
            После запроса на Aniu, получено это аниме.\n${info.img}\nНазвание: ${info.title}\nЕсли результат верный, команда !confirm\nЕсли не верный, команда !changeurl <URI>\n`;
            message.reply(`${response} \nThis action took ${timeAfter}ms`);
        })();
    }
    if (command === "confirm") {
        if (!followProcess) {
            message.reply(`Подтверждать нечего`);
            return;
        }

        if (dubPick && args.length === 0) {
            message.reply(`Во время выбора озвучки, команда ожидает номер озвучки !confirm <n>`);
            return;
        }
        if (dubPick && args.length > 1) {
            message.reply(`Во время выбора озвучки, команда только 1 параметр. Номер озвучки <n> !confirm <n>`);
            return;
        }
        if (dubPick) {
            const n = parseInt(args[0]);
            const dubObj = animeFollowObj.dubInfo[n - 1];
            animeDB.cacheDubs(animeFollowObj.dubInfo);
            const dub = animeDB.getDubCached(dubObj.dubName);
            console.log(animeFollowObj.id, dub, animeFollowObj.url, dubObj.episodes);
            animeDB.setFollow(animeFollowObj.id, dub, animeFollowObj.url, dubObj.episodes);
            message.reply(`Вы выбрали озвучку ${dubObj.dubName}`);
            followProcess = false;
            dubPick = false;
            animeFollowObj = {};
            return;
        }

        if (!dubPick && args.length !== 0) {
            message.reply(`Слишком много параметров: Перед выбором озвучки, команда не ожидает никаких параметров`);
            return;
        }

        if (!dubPick) {
            message.reply(`Запрашиваем сайт на информацию об озвучках. Пожалуйста подождите...`);
            (async () => {
                dubPick = true;
                const timeBefore = Date.now();
                let dubs = await webScraperDiscord.getDubEpisodes(animeFollowObj.url);
                if (dubs == 404) {
                    message.reply(`404, страница не найдена`);
                    return;
                }
                const timeAfter = Date.now() - timeBefore;
                let response = ""
                for (let i = 0; i < dubs.length; i++) {
                    const element = dubs[i];
                    response = `${response}\n${i+1}). ${element.dubName}: ${element.episodes} серий`;
                }
                animeFollowObj.dubInfo = dubs;
                message.reply(`${response}\nВыберете озвучку командой !confirm <n> \nThis action took ${timeAfter}ms`);
                return;
            })();
        }
    }
    if (command === "changeurl") {
        if (!followProcess) {
            message.reply(`Exception: Not implemented`);
            return;
        }
        if (args.length < 1) {
            message.reply(`В процессе follow, команда ожидает параметр <URI>, !changeurl <URI>`);
            return;
        }
        if (args.length > 1) {
            message.reply(`В процессе follow, команда принимает только 1 параметр <URI>\n Чтобы остановить процесс, команда !abort`);
            return;
        }
        (async () => {
            const timeBefore = Date.now();
            const id = args[0];
            animeFollowObj.url = id;
            let info = await webScraperwebScraperDiscord.getAnimeInfoByID(id);
            if (info == 404) {
                message.reply(`404, ничего не найдено`);
                return;
            }
            const timeAfter = Date.now() - timeBefore;
            let response = `
            После запроса на Aniu, получено это аниме.\n${info.img}\nНазвание: ${info.title}\nЕсли результат верный, команда !confirm\nЕсли не верный, команда !changeurl <URI>\n`;
            message.reply(`${response} \nThis action took ${timeAfter}ms`);
        })();
    }
    if (command === "abort") {
        if (!followProcess) {
            message.reply(`Процесс follow не был запущен`);
            return;
        }
        followProcess = false;
        dubPick = false;
        animeFollowObj = {};
        message.reply(`Процесс follow успешно остановлен`);
    }

    if (command === "breakfollow") {
        animeDB.testepisodechange();
        message.reply("mf is broken");
    }

    if (command === "unfollow") {
        message.reply(`Exception: Not implemented`);
    }
    if (command === "getdub") {
        message.reply(`Exception: Not implemented`);
    }
    if (command === "getfollows") {
        const follows = animeDB.cachedFollows;
        if (!follows.length) {
            message.reply("Список пуст");
            return;
        }
        message.reply("Exception: im lazy to serialize this array");
    }
    if (command === "changedub") {
        message.reply(`Exception: Not implemented`);
    }
    if (command === "help") {
        message.reply(
            '```css\n' +
            '!forceUpdate - Останавливает проверку по времени и запускает её снова\n\n' +
            '!getlist - Выводит список аниме и ID на шикимори [Not implemented]\n\n' +
            '!follow <ID> - Запускает процесс Follow, принимает как параметр <ID> аниме на шикимори.\n' +
            '\tВо время процесса Follow, все остальные команды заблокированы\n\n' +
            '!changeurl <ID> <URL> - Изменяет URL аниме на aniu для выбранного тайтла [Not Implemented]\n' +
            '\t!changeurl <URL> - В процессе follow изменяет URL аниме на aniu\n\n' +
            '!confirm - Подтвердить действие\n \tВ процессе follow принимает параметр <n> чтобы выбрать озвучку \n\n' +
            '!abort - Останавливает процесс follow\n\n' +
            '!unfollow <ID> - Выдает список озвучек отслеживаемых для этого тайтла и позволяет отписаться от них [Not Implemented]\n\n' +
            '!getfollows - Выдает список отслеживаемых тайтлов и озвучек [Not Implemented]\n\n' +
            '!getdub <ID> - Выдает список озвучек для тайтла [Not Implemented]\n\n' +
            '!changedub <URL> - Позволяет изменить озвучку для тайтла [Not Implemented]\n\n' +
            '!help - Выводит это сообщение' +
            '```'
        );
    }
});

async function checkShikimoriWatchList() {
    console.log("Checking...")
    let animes = [];
    animes = await shikimoriApi.getAnimeWatchList();
    let suppressNotifications = false;
    if (animeDB.cachedAnime.length < 1) {
        suppressNotifications = true;
    }
    for (let i = 0; i < animes.data.length; i++) {
        const anime = animes.data[i];
        if (!animeDB.isAnimeInDBCached(anime.target_id)) {
            await delay(1000 / 5);
            let animebyID = await shikimoriApi.getAnimeById(anime.target_id);
            animeDB.writeAnimeToDB(animebyID.data);
            if (!suppressNotifications) {
                commandChannel.send(`Новое аниме найдено!\nНазвание:${animebyID.data.russian}\nID: ${animebyID.data.id}\nhttps://shikimori.one${animebyID.data.image.original}`);
            }
            console.log(`Found new anime: ${animebyID.data.russian}`);
        }
    }
    for (let i = 0; i < animeDB.cachedFollows.length; i++) {
        const a = animeDB.cachedFollows[i];
        if (!a.follow) {
            continue;
        }
        let animebyID = await shikimoriApi.getAnimeById(a.animeID);
        animebyID = animebyID.data;
        for (let j = 0; j < a.dubs.length; j++) {
            const dub = a.dubs[j];
            animeDB.cachedFollows[i].dubs[j].checkNewEpisodes = false;
            animeDB.cachedFollows[i].checkNewEpisodes = false;
            console.log(dub.episodes, animebyID.episodes_aired);
            if (dub.episodes < animebyID.episodes_aired) {
                animeDB.cachedFollows[i].dubs[j].checkNewEpisodes = true;
                animeDB.cachedFollows[i].checkNewEpisodes = true;
            }
        }
    }
    await checkNewFollowedEpisodes();
    console.log("Check finished. Waiting...");
}
checkID = setInterval(() => {
    checkShikimoriWatchList().catch((err) => {
        console.log(err);
    });
}, 3600000);

async function checkNewFollowedEpisodes() {
    for (let i = 0; i < animeDB.cachedFollows.length; i++) {
        const anime = animeDB.cachedFollows[i];
        console.log(anime);
        if (!anime.checkNewEpisodes) {
            continue;
        }
        const checkDubs = [];
        for (let j = 0; j < anime.dubs.length; j++) {
            const element = anime.dubs[j];
            if (!element.checkNewEpisodes) {
                continue;
            }
            checkDubs.push(element);
        }
        const checkResult = await webScraperChecker.getEpisodes(anime.animeURL, checkDubs);
        for (let j = 0; j < checkResult.length; j++) {
            const element = checkResult[j];
            console.log(element);
            if (element.hasNewEpisodes === true) {
                infoChannel.send(`<@&${Config.INFO_ROLE_ID}> Вышла новая серия! \nДля аниме ${anime.animeName} вышла ${element.newEpisodeNum} серия в озвучке ${element.dubName} \nhttps://shikimori.one${anime.animeImage}`)
                animeDB.updateEpisodes(anime);
            }
        }
    }
    return 0;
}