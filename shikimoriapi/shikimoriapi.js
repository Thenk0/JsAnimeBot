import axios from "axios";

export default class ShikimoriApi {
    constructor() {
        this.baseUrl = 'https://shikimori.one/api/';
    }

    getAnimeWatchList() {
        let watchList = {};
        return axios.get(`${this.baseUrl}v2/user_rates`, {
            headers: {
                'User-Agent': 'JsAnimeBot',
            },
            params: {
                "user_id": 946450,
                "target_type": "Anime",
                "status": "watching",
            }
        });
    }

    getAnimeById(id) {
        return axios.get(`${this.baseUrl}animes/${id}`, {
            headers: {
                'User-Agent': 'JsAnimeBot',
            },
        });

    }
}