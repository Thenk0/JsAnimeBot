#!/usr/bin/env node

const AnimeDB = require("./shikimoriapi/animedb");
const ShikimoriApi = require("./shikimoriapi/shikimoriapi");
const Config = require("./config");
const WebScraper = require("./webscraper/webscraper");
const Bot = require("./bot/bot");
const Embeds = require("./bot/embeds");
const chalk = require("chalk");
const fs = require('fs');

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

if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}
const shikimoriApi = new ShikimoriApi();
const animeDB = new AnimeDB();
const webScraperDiscord = new WebScraper();
const webScraperChecker = new WebScraper();

let checkID = 0;
const bot = new Bot(webScraperDiscord, animeDB, checkShikimoriWatchList);
let infoChannel = {};
let commandChannel = {};
bot.client.on("ready", async function () {
    console.log(chalk.green(`${Embeds.formatedDate()}: Bot) Bot is ready`));
    infoChannel = bot.client.channels.cache.get(Config.INFO_CHANNEL_ID);
    commandChannel = bot.client.channels.cache.get(Config.COMMAND_CHANNEL_ID);

    checkID = setInterval(() => {
        checkShikimoriWatchList();
    }, 3600000);
    checkShikimoriWatchList();

    bot.checkID = checkID;
    bot.setCommands(bot.client);
    console.log(chalk.green(`${Embeds.formatedDate()}: Bot) Commands are set`));
});

bot.client.on('voiceStateUpdate', (oldState, newState) => {
    let newUserChannel = newState.channelId;
    if (newUserChannel === "962953078414409762") return;
    if (animeDB.isUnsubbedToSounds(newState.id)) return;
    if (newUserChannel !== null && (oldState.channelId !== newState.channelId)) {
        switch (newState.id) {
            case '429295749700911104':
                bot.playsound(newState.channel, "dima.mp3");
                break;
            case '215496875665653760':
                bot.playsound(newState.channel, "maks.mp3");
                break;
            case '317973884156510209':
                bot.playsound(newState.channel, "vlad.mp3");
                break;
            case '277782329940770817':
                bot.playsound(newState.channel, "erik.mp3");
                break;
            case '328511332116725760':
                bot.playsound(newState.channel, "luba.mp3");
                break;
            case '296252867138813962':
                bot.playsound(newState.channel, "ilya.mp3");
                break;
            case '329210681482149888':
                bot.playsound(newState.channel, "vetal.mp3");
                break;
            default:
                break;
        }
    }
});

function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time)
    });
}

async function checkShikimoriWatchList() {
    console.log(chalk.cyan(`${Embeds.formatedDate()}: AutoCheck) Beginning check`));
    let animes = [];
    try {
        animes = await shikimoriApi.getAnimeWatchList();
    } catch (error) {
        console.error(chalk.bold.redBright(`${Embeds.formatedDate()}: Shikimori) WatchList request has failed. Additional info can be found in error.log`));
        console.error(chalk.cyanBright(`${Embeds.formatedDate()}: AutoCheck) Fail was critical: check aborted!`));
        fs.appendFileSync(dir + "/animebot_error.log", `ERROR| ${Embeds.formatedDate()}: Shikimori) getAnimeWatchList request has failed; ${error}\n`);
        return;
    }
    let suppressNotifications = animeDB.cachedAnime.length < 1;

    const listIDs = animes.data.map((anime) => {
        return parseInt(anime.target_id);
    });
    const difference = animeDB.dbAnimeIDs.filter(x => !listIDs.includes(x));
    if (difference.length > 0) animeDB.removeAnimeArray(difference);

    for (let i = 0; i < animes.data.length; i++) {
        const anime = animes.data[i];
        if (animeDB.isAnimeInDBCached(anime.target_id)) continue;
        let animebyID = {};
        try {
            await delay(1000 / 5);
            animebyID = await shikimoriApi.getAnimeById(anime.target_id);
        } catch (error) {
            console.warn(chalk.bold.redBright(`${Embeds.formatedDate()}: Shikimori) AnimeByID request has failed. Additional info can be found in error.log`));
            fs.appendFileSync(dir + "/animebot_error.log", `WARN| ${Embeds.formatedDate()}: Shikimori) animeByID request has failed; ${error}\n`);
            if (typeof error.response.status == "undefined") {
                fs.appendFileSync(dir + "/animebot_error.log", `ERROR| ${Embeds.formatedDate()}: AutoCheck) Fail was critical!\n`);
                console.error(chalk.cyanBright(`${Embeds.formatedDate()}: AutoCheck) Fail was critical: check aborted!`));
                return;
            }
            if (error.response.status == "429") {
                i--;
                continue;
            }
            fs.appendFileSync(dir + "/animebot_error.log", `ERROR| ${Embeds.formatedDate()}: AutoCheck) Fail was critical!\n`);
            console.error(chalk.cyanBright(`${Embeds.formatedDate()}: AutoCheck) Fail was critical: check aborted!`));
            return;
        }
        animeDB.writeAnimeToDB(animebyID.data);
        if (!suppressNotifications) {
            commandChannel.send({
                embeds: [Embeds.newAnime(animebyID.data)]
            });
        }
        console.log(chalk.cyan(`${Embeds.formatedDate()}: Shikimori) Found new anime ${animebyID.data.russian == "" ? animebyID.data.name : animebyID.data.russian}`));
    }

    for (let i = 0; i < animeDB.cachedFollows.length; i++) {
        const a = animeDB.cachedFollows[i];
        if (!a.follow) continue;
        let animebyID = {};
        try {
            console.log(chalk.cyan(`${Embeds.formatedDate()}: AutoCheck) Checking anime id ${a.animeID}`));
            await delay(1000 / 5);
            animebyID = await shikimoriApi.getAnimeById(a.animeID);
        } catch (error) {
            console.error(chalk.bold.redBright(`${Embeds.formatedDate()}: Shikimori) AnimeByID request has failed. Additional info can be found in error.log`));
            fs.appendFileSync(dir + "/animebot_error.log", `WARN| ${Embeds.formatedDate()}: Shikimori) animeByID request has failed; ${error}\n`);
            if (typeof error.response.status == "undefined") {
                fs.appendFileSync(dir + "/animebot_error.log", `ERROR| ${Embeds.formatedDate()}: AutoCheck) Fail was critical!\n`);
                console.error(chalk.cyanBright(`${Embeds.formatedDate()}: AutoCheck) Fail was critical: check aborted!`));
                return;
            }
            if (error.response.status == "429") {
                i--;
                continue;
            }
            fs.appendFileSync(dir + "/animebot_error.log", `ERROR| ${Embeds.formatedDate()}: AutoCheck) Fail was critical!\n`);
            console.error(chalk.cyanBright(`${Embeds.formatedDate()}: AutoCheck) Fail was critical: check aborted!`));
            return;
        }
        animebyID = animebyID.data;
        if (a.currentEpisodes < animebyID.episodes_aired) animeDB.updateEpisode(a, animebyID);
        a.checkNewEpisodes = false;
        for (let j = 0; j < a.dubs.length; j++) {
            const dub = a.dubs[j];
            a.dubs[j].checkNewEpisodes = false;
            console.log(chalk.cyan(`${Embeds.formatedDate()}: AutoCheck) ${a.animeID}: Dub ${dub.dubName} has ${dub.episodes} episodes. Got ${animebyID.episodes_aired} from shikimori`));
            if (dub.episodes < animebyID.episodes_aired) {
                console.log(chalk.cyan(`${Embeds.formatedDate()}: AutoCheck) ${a.animeID}: Dub ${dub.dubName} will be checked`));
                a.dubs[j].checkNewEpisodes = true;
                a.checkNewEpisodes = true;
            }
        }
    }
    await checkNewFollowedEpisodes();
    console.log(chalk.cyan(`${Embeds.formatedDate()}: AutoCheck) Check has finished, next check at ${Embeds.formatedDateWithHourChange(1)}`));
}

async function checkNewFollowedEpisodes() {
    await webScraperChecker.initialize();
    for (let i = 0; i < animeDB.cachedFollows.length; i++) {
        const anime = animeDB.cachedFollows[i];
        console.log(chalk.cyan(`${Embeds.formatedDate()}: AutoCheck) Checking anime ${anime.animeName}`));
        if (!anime.checkNewEpisodes) continue;
        const checkDubs = [];
        for (let j = 0; j < anime.dubs.length; j++) {
            const element = anime.dubs[j];
            if (!element.checkNewEpisodes) continue;
            checkDubs.push(element);
            console.log(chalk.cyan(`${Embeds.formatedDate()}: AutoCheck) \t${anime.animeName} checking dub ${element.dubName}`));
        }
        let checkResult;
        try {
            checkResult = await webScraperChecker.getEpisodes(anime.animeURL, checkDubs);
        } catch (error) {
            await webScraperChecker.reinitialize();
            console.log(error);
            console.warn(chalk.bold.redBright(`Warning! ${Embeds.formatedDate()}: WebScraper) Episode check has failed! Skipping check. For more information check error.log`));
            fs.appendFileSync(dir + "/animebot_error.log", `WARN| ${Embeds.formatedDate()}: WebScraper) Episode check has failed!; ${error}\n`);
            continue;
        }
        if (checkResult == 404) {
            console.warn(chalk.bold.redBright(`Warning! ${Embeds.formatedDate()}: WebScraper) Anime url has changed for ${anime.animeURL}`));
            fs.appendFileSync(dir + "/animebot_error.log", `WARN| ${Embeds.formatedDate()}: WebScraper) Anime url has changed for ${anime.animeURL}\n`);
            return;
        }
        for (let j = 0; j < checkResult.length; j++) {
            const element = checkResult[j];
            if (!element.hasNewEpisodes) continue;
            infoChannel.send({
                content: `<@&${Config.INFO_ROLE_ID}>`,
                embeds: [Embeds.episodeNotification(anime, element)]
            });
            console.log(chalk.cyanBright(`${Embeds.formatedDate()}: AutoCheck) ${anime.animeName} found new episode`));
            animeDB.updateEpisodes(anime);
        }
    }
    await webScraperChecker.close();
    return 0;
}