import axios from "axios";

export default class ShikimoriApi {
    constructor() {
        this.baseUrl = 'https://shikimori.one/api/';

    }


    getAnimeWatchList() {
        axios.get(`${this.baseUrl}v2/user_rates`, {
            headers: {
                'User-Agent': 'node-shikimori'
            },
            params: {
                "user_id": 946450,
                "target_type": "Anime",
                "status": "watching",
            }
        }).then((res) => {
            console.log(res);
        }).catch((err) => {
            console.log(err);
        });
    }
}