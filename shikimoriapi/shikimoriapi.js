const axios = require("axios");
const Config = require("../config");
class ShikimoriApi {
    constructor() {
        this.baseUrl = 'https://shikimori.one/api/';
    }

    getAnimeWatchList() {
        return axios.get(`${this.baseUrl}v2/user_rates`, {
            headers: {
                'User-Agent': Config.SKIKIMORI_APP,
            },
            params: {
                "user_id": Config.SHIKIMORI_ID,
                "target_type": "Anime",
                "status": "watching",
            }
        });
    }

    getAnimeById(id) {
        return axios.get(`${this.baseUrl}animes/${id}`, {
            headers: {
                'User-Agent': Config.SKIKIMORI_APP,
            },
        });
    }
}

module.exports = ShikimoriApi;