import AnimeDB from "./shikimoriapi/animedb.js";
import ShikimoriApi from "./shikimoriapi/shikimoriapi.js";

const shikimoriApi = new ShikimoriApi();
const animeDB = new AnimeDB();

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

(async () => {
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
})().catch((err) => {
    console.log(err);
});