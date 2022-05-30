const sqlite = require("sqlite-sync");
const chalk = require("chalk");
const Embeds = require("../bot/embeds");
const StringSimilarity = require("string-similarity");

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
        // fix for non existant russian name
        let titleName = animeObj.russian;
        if (titleName == "") {
            titleName = animeObj.name;
        }
        let newanimeObj = {
            animeID: animeObj.id,
            animeURL: null,
            maxEpisodes: animeObj.episodes,
            currentEpisodes: animeObj.episodes_aired,
            follow: 0,
            animeName: titleName,
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
            VALUES(?, NULL, ?, ?, 0, ?, ?);`, [animeObj.id, animeObj.episodes, animeObj.episodes_aired, titleName, animeObj.image.original]);
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
        sqlite.run(
            `CREATE TABLE IF NOT EXISTS user_subs (
            id INTEGER PRIMARY KEY,
            user_id STRING NOT NULL,
            sub INTEGER NOT NULL
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
        return result.length > 0;
    }

    isAnimeInDBCached(animeID) {
        return this.dbAnimeIDs.includes(animeID);
    }

    testepisodechange() {
        sqlite.connect(this.dbName);
        sqlite.run(`UPDATE dubNames_animeFollows
                    SET episodes=2
                    WHERE animeFollowID=43608 AND dubNameID=11`);
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
            if (dub.dubName == dubName) return true;
        }
        return false;
    }

    isSubbed(dubObj, animeID) {
        const animeObj = this.getFollowedAnimeCached(animeID);
        if (typeof animeObj == "undefined") return false;
        for (let i = 0; i < animeObj.dubs.length; i++) {
            const dub = animeObj.dubs[i];
            if (dub.dubName == dubObj.dubName) return true;
        }
        return false;
    }

    isUnsubbedToSounds(user_id) {
        sqlite.connect(this.dbName);
        const sub = sqlite.run("SELECT sub FROM user_subs WHERE user_id = ?", [user_id]);
        sqlite.close();
        if (sub.length == 0) return false;
        return !sub[0].sub;
    }

    unsubUser(user_id) {
        sqlite.connect(this.dbName);
        const sub = sqlite.run("SELECT sub FROM user_subs WHERE user_id = ?", [user_id]);
        if (sub.length > 0) {
            sqlite.run("UPDATE user_subs SET sub=0 WHERE user_id = ?", [user_id]);
            sqlite.close();
            return;
        }
        sqlite.run("INSERT INTO user_subs(user_id, sub) VALUES(?,0)", [user_id]);
        sqlite.close();
    }

    subUser(user_id) {
        sqlite.connect(this.dbName);
        const sub = sqlite.run("SELECT sub FROM user_subs WHERE user_id = ?", [user_id]);
        if (sub.length > 0) {
            sqlite.run("UPDATE user_subs SET sub=1 WHERE user_id = ?", [user_id]);
            sqlite.close();
            return;
        }
        sqlite.run("INSERT INTO user_subs(user_id, sub) VALUES(?,1)", [user_id]);
        sqlite.close();
    }

    updateEpisodes(animeObj) {
        for (let i = 0; i < animeObj.dubs.length; i++) {
            const element = animeObj.dubs[i];
            if (element.hasNewEpisodes === false || typeof element.hasNewEpisodes === "undefined") {
                continue;
            }
            const newEpisodeNum = element.newEpisodeNum;
            animeObj.dubs[i].episodes = element.newEpisodeNum;
            const dubID = this.getDubIDByName(element.dubName);
            sqlite.connect(this.dbName);
            // console new episode
            sqlite.run("UPDATE dubNames_animeFollows SET episodes=? WHERE dubNameID=? AND animeFollowID=?", [newEpisodeNum, dubID, animeObj.animeID]);
            sqlite.close();
            delete animeObj.dubs[i].newEpisodeNum;
            delete animeObj.dubs[i].hasNewEpisodes;
            animeObj.dubs[i].checkNewEpisodes = false;
        }
    }

    updateEpisode(anime, shikiObj) {
        anime.currentEpisodes = shikiObj.episodes_aired;
        anime.maxEpisodes = shikiObj.episodes;
        sqlite.connect(this.dbName);
        console.log(chalk.blue(`${Embeds.formatedDate()}: AnimeDB) \t${anime.animeName} episodes updated`));
        sqlite.run("UPDATE animeFollows SET currentEpisodes=?, maxEpisodes=? WHERE animeID=?", [anime.currentEpisodes, anime.maxEpisodes, anime.animeID]);
        sqlite.close();
    }

    getDubIDByName(dubName) {
        for (let i = 0; i < this.cachedDubNames.length; i++) {
            const element = this.cachedDubNames[i];
            if (element.dubName == dubName) return element.id;
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

    getSimilar(name) {
        const names = this.cachedAnime.map((anime) => {
            return anime.animeName;
        });
        const result = StringSimilarity.findBestMatch(name, names);
        if (result.bestMatch.rating < 0.4) return null;
        const animeResult = this.cachedAnime.find((anime) => {
            return anime.animeName == result.bestMatch.target;
        });
        return animeResult;
    }

    cacheDubs(dubs) {
        dubs.forEach(element => {
            if (this.isDubInDBCached(element.dubName)) return;
            sqlite.connect(this.dbName);
            const id = sqlite.run(`INSERT INTO dubNames(dubName) VALUES (?)`, [element.dubName]);
            console.log(chalk.blue(`${Embeds.formatedDate()}: AnimeDB) Found new dub ${element.dubName}`));
            this.cachedDubNames.push({
                id: id,
                dubName: element.dubName,
            });
            sqlite.close();
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
            if (dub.dubName === dubName) return dub;
        }
        return {};
    }

    getAnimeCached(id) {
        return this.cachedAnime.find((value) => {
            return value.animeID == id;
        });
    }
    getFollowedAnimeCached(id) {
        return this.cachedFollows.find((value) => {
            return value.animeID == id;
        });
    }

    setFollow(animeID, dubObj, animeURL, currentEpisodes) {
        animeID = parseInt(animeID);
        for (let i = 0; i < this.cachedAnime.length; i++) {
            const animeObj = this.cachedAnime[i];
            if (animeObj.animeID !== animeID) continue;
            if (!this.isAnimeInDB(animeID)) continue;
            sqlite.connect(this.dbName);
            sqlite.run(
                `UPDATE animeFollows
                 SET follow = 1, animeURL = ?
                 WHERE animeID = ?`, [animeURL, animeID]
            );
            const id = sqlite.run(`INSERT INTO dubNames_animeFollows(animeFollowID, dubNameID, episodes) VALUES(?,?,?)`, [animeID, dubObj.id, currentEpisodes]);
            sqlite.close();
            animeObj.follow = 1;
            animeObj.animeURL = animeURL;
            const followedAnime = this.getFollowedAnimeCached(animeID);
            if (typeof followedAnime == "undefined") {
                this.cachedFollows.push({
                    id: id,
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
                return;
            }
            followedAnime.dubs.push({
                dubName: dubObj.dubName,
                episodes: currentEpisodes,
                checkNewEpisodes: false
            });
            return;
        }
    }
    // TODO: Rewrite to new db
    unfollow(animeID) {
        for (let i = 0; i < this.cachedFollows.length; i++) {
            const animeObj = this.cachedFollows[i];
            if (animeObj.animeID !== animeID) continue;
            if (!this.isAnimeInDB(animeID)) continue;
            sqlite.connect(this.dbName);
            const test = sqlite.run(
                `UPDATE animeFollows
                 SET follow = 0, animeURL=NULL
                 WHERE animeID = ?`, [animeID],
                function (res) {
                    if (res.error)
                        throw res.error;
                }
            );
            const animeCachedObj = this.getAnimeCached(animeID);
            if (typeof animeCachedObj === "undefined") {
                console.log(chalk.redBright(`ERROR ${Embeds.formatedDate()}: AnimeDB) anime in unfollow wasn't found in cache`));
                return;
            }
            animeCachedObj.follow = 0;
            animeCachedObj.animeURL = null;
            sqlite.run(
                `DELETE FROM dubNames_animeFollows
                WHERE animeFollowID=?`, [animeID]
            )
            sqlite.close();
            this.cachedFollows.splice(i, 1);
            return;
        }
    }

    unfollowDub(animeID, dubName) {
        const dubID = this.getDubIDByName(dubName);
        for (let i = 0; i < this.cachedFollows.length; i++) {
            const animeObj = this.cachedFollows[i];
            if (animeObj.animeID !== animeID) continue;
            if (!this.isAnimeInDB(animeID)) continue;
            sqlite.connect(this.dbName);
            sqlite.run(
                `DELETE FROM dubNames_animeFollows
                WHERE animeFollowID=? AND dubNameID=?`, [animeID, dubID]
            )
            sqlite.close();
            for (let j = 0; j < animeObj.dubs.length; j++) {
                const element = animeObj.dubs[j];
                if (element.dubName != dubName) continue;
                this.cachedFollows[i].dubs.splice(j, 1);
                return;
            }
        }
    }

    removeAnimeArray(ids) {
        ids.forEach((id, i) => {
            const anime = this.getAnimeCached(id);
            if (typeof anime === "undefined") return;
            if (anime.follow) this.unfollow(anime.animeID);
            sqlite.connect(this.dbName);
            sqlite.run(
                `DELETE FROM animeFollows
                WHERE animeID=?`, [id]
            );
            sqlite.close();
            console.log(chalk.blue(`${Embeds.formatedDate()}: AnimeDB) ${anime.animeName} was removed`));
            this.cachedAnime.splice(i, 1);
        });
    }
}

module.exports = AnimeDB;