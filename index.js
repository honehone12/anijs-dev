import fs from "node:fs/promises";
import {pino} from "pino";
import { MongoClient } from "mongodb";
import "dotenv/config";

/**
 * 
 * @returns {{
 *  mongoUri: string,
 *  seasonRoot: string,
 *  basePath: string
 * }}
 */
function init() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error('could not fawait res.json()ind env MONGO_URI');
    }

    const seasonRoot = process.env.SEASON_ROOT;
    if (!seasonRoot) {
        throw new Error('could not find env SEASON_ROOT');
    }

    const basePath = process.env.BASE_PATH;
    if (!basePath) {
        throw new Error('could not find env BASE_PATH');
    }

    return {
        mongoUri,
        seasonRoot,
        basePath
    }
}

/**
 * 
 * @param {number} milSec 
 * @returns {Promise<void>}
 */
async function sleep(milSec) {
    return new Promise((resolve) => setTimeout(resolve, milSec));
}

/**
 * 
 * @param {string} basePath 
 * @param {{
 *  year: number,
 *  season: string
 * }} target
 * @param {number} interval 
 * @returns {Promise<any[]>}
 */
async function getASeason(basePath, target, interval) {
    let list = [];

    const seasonPath = `/seasons/${target.year}/${target.season}`;
    let page = 0;
    let next = false;
    
    do {
        page++;
        let url = basePath + seasonPath;
        if (page > 1) {
            const query = `?page=${page}`;
            url += query;
        }
        
        const res = await fetch(url);
        const {data, pagination} = await res.json()
        
        list.push(...data);
        
        next = pagination.has_next_page;
        await sleep(interval);
    } while (next);

    return list;
}

const log = pino();
const interval = 2000;

try {
    const {mongoUri, seasonRoot, basePath} = init();
    const mongoClient = new MongoClient(mongoUri);
    const db = mongoClient.db('anime');
    const collection = db.collection('anime');
    
    //const raw = await fs.readFile(seasonRoot, {encoding: 'utf-8'});
    //const seasons = JSON.parse(raw);
  
    const target = {year: 2025, season: 'winter'};
    log.info(`fetching ${target.year}:${target.season}`);
    const list = await getASeason(basePath, target, interval);
    const result = await collection.insertMany(list);
    log.info(`inserted ${result.insertedCount}items`);
  
    mongoClient.close();
} catch (error) {
    log.error(error);
}

