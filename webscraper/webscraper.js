const puppeteer = require("puppeteer");
const chalk = require("chalk");
const Embeds = require("../bot/embeds");
class WebScraper {
    async initialize() {
        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--autoplay-policy=user-gesture-required',
                '--disable-background-networking',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-breakpad',
                '--disable-client-side-phishing-detection',
                '--disable-component-update',
                '--disable-default-apps',
                '--disable-dev-shm-usage',
                '--disable-domain-reliability',
                '--disable-extensions',
                '--disable-features=AudioServiceOutOfProcess',
                '--disable-hang-monitor',
                '--disable-ipc-flooding-protection',
                '--disable-notifications',
                '--disable-offer-store-unmasked-wallet-cards',
                '--disable-popup-blocking',
                '--disable-print-preview',
                '--disable-prompt-on-repost',
                '--disable-renderer-backgrounding',
                '--disable-setuid-sandbox',
                '--disable-speech-api',
                '--disable-sync',
                '--hide-scrollbars',
                '--ignore-gpu-blacklist',
                '--metrics-recording-only',
                '--mute-audio',
                '--no-default-browser-check',
                '--no-first-run',
                '--no-pings',
                '--no-sandbox',
                '--no-zygote',
                '--password-store=basic',
                '--use-gl=swiftshader',
                '--use-mock-keychain',
            ],
        });
        this.filters = [
            "appmetrika.yandex.ru",
            "yandex",
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
            "fonts",
        ];
    }

    async reinitialize() {
        await this.browser.close();
        await this.initialize();
    }

    async close() {
        await this.browser.close();
    }

    async getEpisodes(animeURL, dubs) {
        const page = await this.browser.newPage();
        await page.setViewport({
            width: 1600,
            height: 900
        });
        await page.setRequestInterception(true);
        page.on("request", (request) => {
            if (request.resourceType() === 'image' || request.resourceType() === "font") {
                return request.abort();
            }
            const url = request.url();
            const shouldAbort = this.filters.some(
                (urlPart) => url.includes(urlPart)
            );
            if (shouldAbort) {
                request.abort();
            } else {
                request.continue();
            }
        });
        const response = await page.goto(`https://aniu.ru/anime/${animeURL}`, {
            waitUntil: "domcontentloaded",
            timeout: 120000,
        });
        console.log(chalk.magenta(`${Embeds.formatedDate()}: WebScraper) Url https://aniu.ru/anime/${animeURL} opened`));
        if (response.status() === 404) {
            page.close();
            return 404;
        }
        if (response.status() != 200) {
            throw new Error(`Page has returned ${response.status()} code`)
        }
        let div_selector_to_remove = ".navbar";
        await page.evaluate((sel) => {
            var elements = document.querySelectorAll(sel);
            for (var i = 0; i < elements.length; i++) {
                elements[i].parentNode.removeChild(elements[i]);
            }
        }, div_selector_to_remove);
        await page.waitForSelector("#player-iframe");
        let elementHandle = await page.$("#player-iframe");
        await page.evaluate(() => {
            const el = document.querySelector("div.player");
            const rect = el.getBoundingClientRect();
            const x = rect.left + window.scrollX;
            const y = rect.top + window.scrollY - 200;
            window.scrollTo(parseInt(x || 0, 10), parseInt(y || 0, 10));
        });
        let frame = await elementHandle.contentFrame();
        await frame.waitForSelector(".serial-panel");
        for (let i = 0; i < dubs.length; i++) {
            const dub = dubs[i];
            const dubName = dub.dubName;
            await page.evaluate(() => {
                const el = document.querySelector("div.player");
                const rect = el.getBoundingClientRect();
                const x = rect.left + window.scrollX;
                const y = rect.top + window.scrollY - 200;
                window.scrollTo(parseInt(x || 0, 10), parseInt(y || 0, 10));
            });
            let elementHandle = await page.$("#player-iframe");
            console.log(chalk.magenta(`${Embeds.formatedDate()}: WebScraper) Player frame found`));
            let frame = await elementHandle.contentFrame();
            await frame.waitForSelector(".serial-panel");
            console.log(chalk.magenta(`${Embeds.formatedDate()}: WebScraper) Player frame loaded`));

            await frame.click("body > .main-box > .serial-panel > .serial-translations-box > .select-button");
            if (dubName.includes("SUB")) {
                const newelement = dubName.replace("SUB", "");
                const [el] = await frame.$x(`//div[span[text()='${newelement}'] and span[text()='SUB']]`);
                await Promise.all([
                    el.click(),
                    frame.waitForNavigation({
                        waitUntil: 'load'
                    }),
                ]);
            } else {
                const [el] = await frame.$x(`//div[span[text()='${dubName}']]`);
                await Promise.all([
                    el.click(),
                    frame.waitForNavigation({
                        waitUntil: 'load'
                    }),
                ]);
            }
            console.log(chalk.magenta(`${Embeds.formatedDate()}: WebScraper) Clicked on dub ${dubName}`));
            elementHandle = await page.$("#player-iframe");
            frame = await elementHandle.contentFrame();
            await frame.waitForSelector(".serial-panel");
            let episodes = await frame.$$(".serial-series-box > .dropdown > .dropdown-content > div");
            console.log(chalk.magenta(`${Embeds.formatedDate()}: WebScraper) Got ${episodes.length} episodes`));
            dubs[i].hasNewEpisodes = dub.episodes < episodes.length;
            dubs[i].newEpisodeNum = episodes.length;
        }

        await page.close();
        return dubs;
    }

    async getDubs() {
        const page = await this.browser.newPage();
        await page.setViewport({
            width: 1600,
            height: 900
        });
        await page.setRequestInterception(true);
        page.on("request", (request) => {
            if (request.resourceType() === 'image' || request.resourceType() === "font") {
                return request.abort();
            }
            const url = request.url();
            const shouldAbort = this.filters.some(
                (urlPart) => url.includes(urlPart)
            );
            if (shouldAbort) {
                request.abort();
            } else {
                request.continue();
            }
        });
        const response = await page.goto('https://aniu.ru/anime/sabikui_bisco-48414/', {
            waitUntil: "domcontentloaded",
            timeout: 120000,
        });
        if (response.status() == 404) {
            page.close();
            return 404;
        }
        if (response.status() != 200) {
            throw new Error(`Page has returned ${response.status()} code`)
        }
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
        const dubs = await frame.$$(".serial-translations-box > .dropdown > .dropdown-content > div");
        let dubText = "";
        for (let i = 0; i < dubs.length; i++) {
            const element = dubs[i];
            const value = await element.evaluate(el => el.textContent.replace(/[\n\r]+|[\s]{2,}/g, ' ').trim());
            dubText = `${dubText}\n${i+1}): ${value}`;
        }
        await page.close();
        return dubText;
    }

    async getDubEpisodes(animeURL) {
        const page = await this.browser.newPage();
        await page.setViewport({
            width: 1600,
            height: 900
        });
        await page.setRequestInterception(true);
        page.on("request", (request) => {
            if (request.resourceType() === 'image' || request.resourceType() === "font") {
                return request.abort();
            }
            const url = request.url();
            const shouldAbort = this.filters.some(
                (urlPart) => url.includes(urlPart)
            );
            if (shouldAbort) {
                request.abort();
            } else {
                request.continue();
            }
        });
        const response = await page.goto(`https://aniu.ru/anime/${animeURL}`, {
            waitUntil: "domcontentloaded",
            timeout: 120000,
        });
        console.log(chalk.magenta(`${Embeds.formatedDate()}: WebScraper) Url https://aniu.ru/anime/${animeURL} opened`));
        if (response.status() === 404) {
            page.close();
            console.log(chalk.magenta(`${Embeds.formatedDate()}: WebScraper) Page returned 404`));
            return 404;
        }
        if (response.status() != 200) {
            throw new Error(`Page has returned ${response.status()} code`)
        }
        await page.waitForSelector("#player-iframe");
        console.log(chalk.magenta(`${Embeds.formatedDate()}: WebScraper) Waiting for player`));
        let elementHandle = await page.$("#player-iframe");
        await page.evaluate(() => {
            const el = document.querySelector("div.player");
            const rect = el.getBoundingClientRect();
            const x = rect.left + window.scrollX;
            const y = rect.top + window.scrollY - 200;
            window.scrollTo(parseInt(x || 0, 10), parseInt(y || 0, 10));
        });
        let frame = await elementHandle.contentFrame();
        await frame.waitForSelector(".serial-panel");
        console.log(chalk.magenta(`${Embeds.formatedDate()}: WebScraper) Player is ready`));
        let dubs = await frame.$$(".serial-translations-box > .dropdown > .dropdown-content > div");
        let dubsArray = [];
        for (let i = 0; i < dubs.length; i++) {
            const element = dubs[i];
            let value = await element.evaluate(el => el.textContent.replace(/[\n\r]+|[\s]{2,}/g, ' ').trim());
            dubsArray.push(value);
        }
        let newDubsArray = [];
        for (let i = 0; i < dubsArray.length; i++) {
            const element = dubsArray[i];
            await page.evaluate(() => {
                const el = document.querySelector("div.player");
                const rect = el.getBoundingClientRect();
                const x = rect.left + window.scrollX;
                const y = rect.top + window.scrollY - 200;
                window.scrollTo(parseInt(x || 0, 10), parseInt(y || 0, 10));
            });
            let elementHandle = await page.$("#player-iframe");
            let frame = await elementHandle.contentFrame();
            await frame.waitForSelector(".serial-panel");
            await frame.click("body > .main-box > .serial-panel > .serial-translations-box > .select-button")
            console.log(chalk.magenta(`${Embeds.formatedDate()}: WebScraper) Clicked on dub ${element}`));
            if (element.includes("SUB")) {
                const newelement = element.replace("SUB", "");
                const [el] = await frame.$x(`//div[span[text()='${newelement}'] and span[text()='SUB']]`);
                await Promise.all([
                    el.click(),
                    frame.waitForNavigation({
                        waitUntil: 'load'
                    }),
                ]);
            } else {
                const [el] = await frame.$x(`//div[span[text()='${element}']]`);
                await Promise.all([
                    el.click(),
                    frame.waitForNavigation({
                        waitUntil: 'load'
                    }),
                ]);
            }
            elementHandle = await page.$("#player-iframe");
            frame = await elementHandle.contentFrame();
            await frame.waitForSelector(".serial-panel");
            let episodes = await frame.$$(".serial-series-box > .dropdown > .dropdown-content > div");
            console.log(chalk.magenta(`${Embeds.formatedDate()}: WebScraper) Got ${episodes.length} episodes`));
            newDubsArray.push({
                dubName: dubsArray[i],
                episodes: episodes.length,
            });
        }

        await page.close();
        return newDubsArray;
    }

    async getAnimeInfoByID(animeID) {
        const page = await this.browser.newPage();
        await page.setViewport({
            width: 1600,
            height: 900
        });
        await page.setRequestInterception(true);
        page.on("request", (request) => {
            if (request.resourceType() === 'image' || request.resourceType() === "font") {
                return request.abort();
            }
            const url = request.url();
            const shouldAbort = this.filters.some(
                (urlPart) => url.includes(urlPart)
            );
            if (shouldAbort) {
                request.abort();
            } else {
                request.continue();
            }
        });
        const response = await page.goto(`https://aniu.ru/anime/${animeID}`, {
            waitUntil: "domcontentloaded",
            timeout: 120000,
        });
        console.log(chalk.magenta(`${Embeds.formatedDate()}: WebScraper) Url https://aniu.ru/anime/${animeID} opened`));
        if (response.status() == 404) {
            page.close();
            console.log(chalk.magenta(`${Embeds.formatedDate()}: WebScraper) Page returned 404`));
            return 404;
        }
        if (response.status() != 200) {
            throw new Error(`Page has returned ${response.status()} code`)
        }
        await page.waitForSelector("#player-iframe");
        const titleName = await page.$eval("h1.p-0", (el) => el.textContent.replace(/[\n\r]+|[\s]{2,}/g, ' ').trim());
        let imgSrc = await page.$eval(".poster-img", (el) => el.getAttribute("src"));
        imgSrc = `https://aniu.ru${imgSrc}`;
        await page.close();
        console.log(chalk.magenta(`${Embeds.formatedDate()}: WebScraper) Got image ${imgSrc}`));
        console.log(chalk.magenta(`${Embeds.formatedDate()}: WebScraper) Got title ${titleName}`));
        return {
            img: imgSrc,
            title: titleName
        };
    }


}

module.exports = WebScraper;