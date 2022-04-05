import sqlite from "sqlite-sync";


export default class AnimeDB {
    constructor() {
        this.cachedAnime = [];
        sqlite.connect("animeDB.sqlite");
        this.initialize();
        this.getCachedAnimeFromDB();
        this.dbAnimeIDs = this.getdbAnimeIDs();
    }

    writeAnimeToDB(animeObj) {
        this.cachedAnime.push(animeObj);
        this.dbAnimeIDs.push(animeObj.id);

        sqlite.run(
            `INSERT INTO animeFollows(
                animeID, 
                animeURL,
                dubName, 
                maxEpisodes,
                currentEpisodes,
                follow)
            VALUES(?, NULL, NULL, ?, ?, 0);`, [animeObj.id, animeObj.episodes, animeObj.episodes_aired],
            function (res) {
                if (res.error)
                    throw res.error;
            }
        );
    }

    initialize() {
        sqlite.run(
            `CREATE TABLE IF NOT EXISTS animeFollows (
            id INTEGER PRIMARY KEY,
            animeID INT UNSIGNED NOT NULL,
            animeURL TEXT NULLABLE,
            dubName TEXT NULLABLE,
            maxEpisodes INT NOT NULL,
            currentEpisodes INT NOT NULL,
            follow BOOL NOT NULL
            );`,
            function (res) {
                if (res.error)
                    throw res.error;
            }
        );
    }

    isAnimeInDB(animeID) {
        let result = sqlite.run("SELECT * FROM animeFollows WHERE animeID=?", [animeID]);
        return result.length > 0;
    }
    isAnimeInDBCached(animeID) {
        return this.dbAnimeIDs.includes(animeID);
    }

    getCachedAnimeFromDB() {
        let cachedAnime = [];
        cachedAnime = sqlite.run("SELECT * FROM animeFollows");
        this.setCachedAnime(cachedAnime);
    }

    setCachedAnime(cachedAnime) {
        this.cachedAnime = cachedAnime;
    }

    getdbAnimeIDs() {
        let ids = [];
        this.cachedAnime.forEach(anime => {
            ids.push(anime.animeID);
        });
        return ids;
    }
}