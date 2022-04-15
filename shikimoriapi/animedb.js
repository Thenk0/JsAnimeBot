const sqlite = require("sqlite-sync");
class AnimeDB {
    constructor() {
        this.cachedAnime = [];
        this.dbName = "animeDB.sqlite";
        this.initialize();
        this.getCachedAnimeFromDB();
        this.getCachedDubNames();
        this.getFollows();
        this.dbAnimeIDs = this.getdbAnimeIDs();
    }

    writeAnimeToDB(animeObj) {
        let newanimeObj = {
            animeID: animeObj.id,
            animeURL: null,
            maxEpisodes: animeObj.episodes,
            currentEpisodes: animeObj.episodes_aired,
            follow: 0,
            animeName: animeObj.russian,
            animeImage: animeObj.image.original
        };
        this.cachedAnime.push(newanimeObj);
        this.dbAnimeIDs.push(animeObj.id);
        sqlite.connect(this.dbName);
        const id = sqlite.run(
            `INSERT INTO animeFollows(
                animeID,
                animeURL,
                maxEpisodes,
                currentEpisodes,
                follow,
                animeName,
                animeImage)
            VALUES(?, NULL, ?, ?, 0, ?, ?);`, [animeObj.id, animeObj.episodes, animeObj.episodes_aired, animeObj.russian, animeObj.image.original]);
        sqlite.close();
    }

    initialize() {
        sqlite.connect(this.dbName);
        sqlite.run(
            `CREATE TABLE IF NOT EXISTS animeFollows (
            id INTEGER PRIMARY KEY,
            animeID INT UNSIGNED NOT NULL,
            animeURL TEXT NULLABLE,
            maxEpisodes INT NOT NULL,
            currentEpisodes INT NOT NULL,
            follow BOOL NOT NULL,
            animeName TEXT NOT NULL,
            animeImage TEXT NOT NULL
            );`,
            function (res) {
                if (res.error)
                    throw res.error;
            }
        );
        sqlite.run(`CREATE TABLE IF NOT EXISTS dubNames (
            id INTEGER PRIMARY KEY,
            dubName VARCHAR(40)
            );`,
            function (res) {
                if (res.error)
                    throw res.error;
            }
        );
        sqlite.run(`CREATE TABLE IF NOT EXISTS cachedDubs (
            id INTEGER PRIMARY KEY,
            animeFollowID INTEGER,
            dubNameID INTEGER,
            FOREIGN KEY (animeFollowID) REFERENCES animeFolows(animeID),
            FOREIGN KEY (dubNameID) REFERENCES animeFolows(id)
            );`,
            function (res) {
                if (res.error)
                    throw res.error;
            }
        );
        sqlite.run(`CREATE TABLE IF NOT EXISTS dubNames_animeFollows (
            id INTEGER PRIMARY KEY,
            animeFollowID INTEGER,
            dubNameID INTEGER,
            episodes INTEGER UNSIGNED,
            FOREIGN KEY (animeFollowID) REFERENCES animeFolows(animeID)
            FOREIGN KEY (dubNameID) REFERENCES animeFolows(id)
            );`,
            function (res) {
                if (res.error)
                    throw res.error;
            }
        );
        sqlite.close();
    }

    isAnimeInDB(animeID) {
        sqlite.connect(this.dbName);
        let result = sqlite.run("SELECT * FROM animeFollows WHERE animeID=?", [animeID]);
        sqlite.close();
        console.log(result);
        return result.length > 0;
    }
    isAnimeInDBCached(animeID) {
        return this.dbAnimeIDs.includes(animeID);
    }

    testepisodechange() {
        sqlite.connect(this.dbName);
        sqlite.run(`UPDATE dubNames_animeFollows
                    SET episodes=10
                    WHERE animeFollowID=44516 AND dubNameID=1`);
        this.cachedFollows[0].dubs[0].episodes = 10;
        sqlite.close();
    }

    isDubInDB(dubName) {
        sqlite.connect(this.dbName);
        let result = sqlite.run("SELECT * FROM dubNames WHERE dubName=?", [dubName]);
        sqlite.close();
        return result.length > 0;
    }

    isDubInDBCached(dubName) {
        for (let i = 0; i < this.cachedDubNames.length; i++) {
            const dub = this.cachedDubNames[i];
            if (dub.dubName == dubName) {
                return true;
            }
        }
        return false;
    }

    updateEpisodes(animeObj) {
        for (let i = 0; i < animeObj.dubs.length; i++) {
            const element = animeObj.dubs[i];
            const newEpisodeNum = element.newEpisodeNum;
            animeObj.dubs[i].episodes = element.newEpisodeNum;
            const dubID = this.getDubIDByName(element.dubName);
            sqlite.connect(this.dbName);
            console.log(newEpisodeNum, dubID, element.animeID);
            sqlite.run("UPDATE dubNames_animeFollows SET episodes=? WHERE dubNameID=? AND animeFollowID=?", [newEpisodeNum, dubID, animeObj.animeID]);
            sqlite.close();
            delete animeObj.dubs[i].newEpisodeNum;
            delete animeObj.dubs[i].hasNewEpisodes;
            animeObj.dubs[i].checkNewEpisodes = false;
        }
    }

    getDubIDByName(dubName) {
        for (let i = 0; i < this.cachedDubNames.length; i++) {
            const element = this.cachedDubNames[i];
            if (element.dubName == dubName) {
                return element.id;
            }
        }
    }

    getCachedAnimeFromDB() {
        let cachedAnime = [];
        sqlite.connect(this.dbName);
        cachedAnime = sqlite.run("SELECT * FROM animeFollows");
        sqlite.close();
        this.setCachedAnime(cachedAnime);
    }

    getCachedDubNames() {
        sqlite.connect(this.dbName);
        let cachedDubNames = sqlite.run("SELECT * FROM dubNames");
        sqlite.close();
        this.cachedDubNames = cachedDubNames;
        if (cachedDubNames.length == 0) {
            this.cachedDubNames = [];
        }
    }

    setCachedAnime(cachedAnime) {
        this.cachedAnime = cachedAnime;
    }

    cacheDubs(dubs) {
        dubs.forEach(element => {
            if (!this.isDubInDBCached(element.dubName)) {
                sqlite.connect(this.dbName);
                const id = sqlite.run(`INSERT INTO dubNames(dubName) VALUES (?)`, [element.dubName]);
                console.log(`Found new dub ${element.dubName}`);
                this.cachedDubNames.push({
                    id: id,
                    dubName: element.dubName,
                });
                sqlite.close();
            }
        });
    }

    getdbAnimeIDs() {
        let ids = [];
        this.cachedAnime.forEach(anime => {
            ids.push(anime.animeID);
        });
        return ids;
    }

    getFollows() {
        sqlite.connect(this.dbName);
        let follows = sqlite.run("SELECT * FROM animeFollows WHERE follow=1");
        for (let i = 0; i < follows.length; i++) {
            const follow = follows[i];
            follows[i].dubs = [];
            const tableInfo = sqlite.run(`SELECT * FROM dubNames_animeFollows WHERE animeFollowID=?`, [follow.animeID]);
            for (let j = 0; j < tableInfo.length; j++) {
                const tableInfoElement = tableInfo[j];
                const dubName = sqlite.run("SELECT * FROM dubNames WHERE id=?", [tableInfoElement.dubNameID]);
                follows[i].dubs.push({
                    dubName: dubName[0].dubName,
                    episodes: tableInfoElement.episodes,
                    checkNewEpisodes: false
                });
                follows[i].checkNewEpisodes = false;
            }
        }
        sqlite.close();
        this.cachedFollows = follows;
    }

    getDubCached(dubName) {
        for (let i = 0; i < this.cachedDubNames.length; i++) {
            const dub = this.cachedDubNames[i];
            if (dub.dubName === dubName) {
                return dub;
            }
        }
        return {};
    }

    setFollow(animeID, dubObj, animeURL, currentEpisodes) {
        animeID = parseInt(animeID);
        for (let i = 0; i < this.cachedAnime.length; i++) {
            const element = this.cachedAnime[i];
            if (element.animeID !== animeID) {
                continue;
            }
            if (!this.isAnimeInDB(animeID)) {
                continue;
            }
            sqlite.connect(this.dbName);
            const test = sqlite.run(
                `UPDATE animeFollows
                 SET follow = 1, animeURL = ?
                 WHERE animeID = ?`, [animeURL, animeID]
            );
            const id = sqlite.run(`INSERT INTO dubNames_animeFollows(animeFollowID, dubNameID, episodes) VALUES(?,?,?)`, [animeID, dubObj.id, currentEpisodes]);
            sqlite.close();
            this.cachedAnime[i].follow = 1;
            this.cachedAnime[i].animeURL = animeURL;
            const animeObj = this.cachedAnime[i];
            console.log(animeObj);
            this.cachedFollows.push({
                animeID: animeObj.animeID,
                animeURL: animeObj.animeURL,
                maxEpisodes: animeObj.maxEpisodes,
                currentEpisodes: animeObj.currentEpisodes,
                follow: 1,
                animeName: animeObj.animeName,
                animeImage: animeObj.animeImage,
                checkNewEpisodes: false,
                dubs: [{
                    dubName: dubObj.dubName,
                    episodes: currentEpisodes,
                    checkNewEpisodes: false
                }],
            });
            console.log("followed successfuly")
            return;
        }
    }
    // TODO: Rewrite to new db
    unfollow(animeID) {
        for (let i = 0; i < this.cachedAnime.length; i++) {
            const element = this.cachedAnime[i];
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

module.exports = AnimeDB;