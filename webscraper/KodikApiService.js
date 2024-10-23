/* eslint-disable camelcase */
const fetch = require('axios');
const config = require('../config')

const RequestStatuses = {
    OK: 200,
    InternalServerError: 500
}

class KodikApiService {
    baseurl = 'https://kodikapi.com';

    async _requestFullAnime(shikimori_id) {
        const params = new URLSearchParams({
            token: config.KODIK_API_KEY,
            shikimori_id: shikimori_id.toString(),
            with_material_data: 'true'
        });
        const response = await fetch(`${this.baseurl}/search`, {
            method: 'POST',
            params: params,
            timeout: 10000
        });
        if (response.status !== RequestStatuses.OK)
            throw {
                reqStatus: RequestStatuses.InternalServerError,
                message: 'Server error'
            };
        const res = response;
        return res.data;
    }

    async _requestAnime(shikimori_id) {
        const params = new URLSearchParams({
            token: config.KODIK_API_KEY,
            shikimori_id: shikimori_id.toString()
        });
        const response = await fetch(`${this.baseurl}/search`, {
            method: 'POST',
            params: params
        });
        if (response.status !== RequestStatuses.OK)
            throw {
                reqStatus: RequestStatuses.InternalServerError,
                message: 'Server error'
            };
        return response.data;
    }

    _packFullAnime(request) {
        const { reqStatus, shikimori_request, time, total, results } = request;
        if (results.length == 0) {
            const newResult = request;
            newResult.result = null;
            delete newResult.results;
            return newResult;
        }
        const translations = new Map();

        for (const res of results) {
            let episodes = res.episodes_count ?? 1;
            if (episodes === undefined) {
                episodes = res.material_data.episodes_aired;
            }
            const { title, type, id } = res.translation;

            const translation = translations.get(id);
            if (typeof translation !== 'undefined' && translation.episodes_count <= episodes) {
                continue;
            }

            translations.set(id, {
                episodes_count: episodes,
                link: res.link,
                title,
                type,
                id
            });
        }
        const resultObj = results[0];
        resultObj.translations = [...translations.values()];
        delete resultObj.translation;
        delete resultObj.episodes_count;
        const newResult = {
            reqStatus,
            shikimori_request,
            time,
            total,
            result: resultObj
        };
        return newResult;
    }

    _packAnime(request) {
        const { reqStatus, time, total, results } = request;
        if (results.length == 0) {
            const newResult = request;
            newResult.result = null;
            delete newResult.results;
            return newResult;
        }
        const translations = new Map();
        for (const res of results) {
            const episodes = res.episodes_count ?? 1;
            const { title, type, id } = res.translation;

            const translation = translations.get(id);
            if (typeof translation !== 'undefined' && translation.episodes_count <= episodes) {
                continue;
            }

            translations.set(id, {
                episodes_count: episodes,
                link: res.link,
                title,
                type,
                id
            });
        }
        const resultObj = results[0];
        resultObj.translations = [...translations.values()];
        delete resultObj.translation;
        delete resultObj.episodes_count;
        const newResult = {
            reqStatus,
            time,
            total,
            result: resultObj
        };
        return newResult;
    }

    async _getAnimeFull(shikimori_id) {
        const response = await this._requestFullAnime(shikimori_id);
        const packedAnime = this._packFullAnime(response);
        if (!packedAnime.result) return;
        return packedAnime.result;
    }

    async _getAnime(shikimori_id) {
        const response = await this._requestAnime(shikimori_id);
        const packedAnime = this._packAnime(response);
        if (!packedAnime.result) return;
        return packedAnime.result;
    }

    async getGenres() {
        const params = new URLSearchParams({
            token: config.KODIK_API_KEY,
            genres_type: 'shikimori',
            types: 'anime'
        });
        const response = await fetch(`${this.baseurl}/genres`, {
            method: 'POST',
            body: params
        });
        if (response.status !== RequestStatuses.OK)
            throw {
                reqStatus: RequestStatuses.InternalServerError,
                message: 'Server error'
            };
        return response.data;
    }

    async getTranslationGroups() {
        const params = new URLSearchParams({
            token: config.KODIK_API_KEY,
            genres_type: 'shikimori'
        });
        const response = await fetch(`${this.baseurl}/translations`, {
            method: 'POST',
            body: params
        });
        return response.data;
    }

    async getFullBatchAnime(shikimoriIds) {
        const awaitResult = [];
        for (const shikimori_id of shikimoriIds) {
            const promise = this._getAnimeFull(shikimori_id);
            awaitResult.push(promise);
        }
        let result = await Promise.all(awaitResult);
        result = result.filter((anime) => {
            return anime !== undefined;
        });
        return result;
    }

    async getBatchAnime(shikimoriIds) {
        const awaitResult = [];
        for (const shikimori_id of shikimoriIds) {
            const promise = this._getAnime(shikimori_id);
            awaitResult.push(promise);
        }
        let result = await Promise.all(awaitResult);
        result = result.filter((anime) => {
            return anime !== undefined;
        });
        return result;
    }

    async getFullAnime(shikimoriId) {
        const anime = await this._getAnimeFull(shikimoriId);
        return anime;
    }

    async getAnime(shikimoriId) {
        const anime = await this._getAnime(shikimoriId);
        return anime;
    }
}

module.exports = KodikApiService;