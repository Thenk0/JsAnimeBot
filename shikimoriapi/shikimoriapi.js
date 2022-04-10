import axios from "axios";
import Config from "../config.js";
export default class ShikimoriApi {
    constructor() {
        this.baseUrl = 'https://shikimori.one/api/';
    }

    getAnimeWatchList() {
        let watchList = {};
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