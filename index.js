import AnimeDB from "./shikimoriapi/animedb.js";
import ShikimoriApi from "./shikimoriapi/shikimoriapi.js";
import puppeteer from "puppeteer";
import Discord from "discord.js";
import Config from "./config.js";

const shikimoriApi = new ShikimoriApi();
const animeDB = new AnimeDB();
const client = new Discord.Client({
    intents: ["GUILDS", "GUILD_MESSAGES"]
});
client.login(Config.BOT_TOKEN);
const prefix = "!";
client.on("messageCreate", function (message) {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

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
});

function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time)
    });
}

async function checkShikimoriWatchList() {
    console.log("Checking...")
    let animes = [];
    animes = await shikimoriApi.getAnimeWatchList();

    for (let i = 0; i < animes.data.length; i++) {
        const anime = animes.data[i];
        if (!animeDB.isAnimeInDBCached(anime.target_id)) {
            await sleep(1000 / 5);
            let animebyID = await shikimoriApi.getAnimeById(anime.target_id);
            animeDB.writeAnimeToDB(animebyID.data);
        }
    }
    console.log("Check finished. Waiting...");
}

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 250, // slow down by 250ms,
        args: ['--start-maximized'],
    });
    const page = await browser.newPage();
    await page.setViewport({
        width: 1600,
        height: 900
    });
    await page.setRequestInterception(true);
    page.on("request", (request) => {
        const url = request.url();
        const filters = [
            "appmetrika.yandex.ru",
            "mc.yandex.ru",
            "googleadservices",
            "doubleclick",
            "idsync",
            "quant",
            "facebook",
            "amazon",
            "tracking",
            "taboola",
            ".gif",
            "google-analytics",
            "forter",
        ];

        const shouldAbort = filters.some(
            (urlPart) => url.includes(urlPart) && !url.includes("https://www.retailmenot.com/tng/_next/static/chunks/commons.")
        );
        if (shouldAbort) request.abort();
        else {
            request.continue();
        }
    });
    await page.goto('https://aniu.ru/anime/sabikui_bisco-48414/', {});
    console.log("waiting for selector");
    await page.waitForSelector("#player-iframe");
    console.log("selector loaded");
    console.log("searching for frame");
    let elementHandle = await page.$("#player-iframe");
    console.log("frame found");
    let frame = await elementHandle.contentFrame();
    console.log("waiting for selector");
    await frame.waitForSelector(".serial-panel");
    console.log("selector loaded");
    delay(500);
    await page.evaluate(selector => {
        window.scrollBy(0, 1000);
    });
    await frame.click("body > .main-box > .serial-panel > .serial-translations-box > .select-button");
    console.log("clicked");
    const [el] = await frame.$x("//span[text()='AniRise']");
    await el.click();

    elementHandle = await page.$("#player-iframe");
    console.log("frame found");
    frame = await elementHandle.contentFrame();
    await frame.waitForSelector(".serial-panel");
    let episodes = await frame.$$(".serial-series-box > .dropdown > .dropdown-content > div");
    console.log(episodes.length)
    await browser.close();
})();

// checkShikimoriWatchList().catch((err) => {
//     console.log(err);
// });


// setInterval(() => {
//     checkShikimoriWatchList().catch((err) => {
//         console.log(err);
//     });
// }, 40000);