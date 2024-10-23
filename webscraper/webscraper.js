const KodikApiService = require("./KodikApiService");
class WebScraper {
    async initialize() { }

    async reinitialize() { }

    async close() { }

    async getEpisodes(id, dubs) {

        const kodik = new KodikApiService();

        const anime = await kodik.getFullAnime(id);
        const translations = anime.translations;

        for (let i = 0; i < dubs.length; i++) {
            const dub = dubs[i];
            const translation = translations.find(translation => translation.title === dub.dubName);
            if (typeof translation === "undefined") {
                dubs[i] = null;
                continue;
            };

            dubs[i].hasNewEpisodes = dub.episodes < translation.episodes_count;
            dubs[i].newEpisodeNum = translation.episodes_count;
        }

        return dubs;
    }


    async getDubEpisodes(id) {
        const kodik = new KodikApiService();

        const anime = await kodik.getFullAnime(id);
        const translations = [];
        for (const translation of anime.translations) {
            translations.push({
                dubName: translation.title,
                episodes: translation.episodes_count,
            })
        }
        return translations;
    }

    async getAnimeInfoByID(animeID) {
        const kodik = new KodikApiService();

        const anime = await kodik.getFullAnime(animeID);
        const materialData = anime.material_data;
        return {
            img: materialData.poster_url,
            title: materialData.title
        };
    }


}

module.exports = WebScraper;