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

    setFollow(animeID, dubName, animeURL) {
        for (let i = 0; i < this.cachedAnime.length; i++) {
            const element = this.cachedAnime[i];
            console.log(element.animeID);
            if (element.animeID !== animeID) {
                continue;
            }
            if (!this.isAnimeInDB(element.animeID)) {
                continue;
            }
            sqlite.run(
                `UPDATE animeFollows
                 SET follow = 1, dubName = ?, animeURL = ?
                 WHERE animeID = ?`, [dubName, animeURL, animeID],
                function (res) {
                    if (res.error)
                        throw res.error;
                }
            );
            this.cachedAnime[i].follow = 1;
            this.cachedAnime[i].animeURL = animeURL;
            this.cachedAnime[i].dubName = dubName;
        }
    }

    unfollow(animeID) {
        for (let i = 0; i < this.cachedAnime.length; i++) {
            const element = this.cachedAnime[i];
            console.log(element.animeID);
            if (element.animeID !== animeID) {
                continue;
            }
            if (!this.isAnimeInDB(element.animeID)) {
                continue;
            }
            sqlite.run(
                `UPDATE animeFollows
                 SET follow = 1, dubName = NULL, animeURL = NULL
                 WHERE animeID = ?`, [animeID],
                function (res) {
                    if (res.error)
                        throw res.error;
                }
            );
            this.cachedAnime[i].follow = 0;
            this.cachedAnime[i].animeURL = null;
            this.cachedAnime[i].dubName = null;
        }
    }
}