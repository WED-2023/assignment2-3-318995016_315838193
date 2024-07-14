require("dotenv").config();
const MySql = require("./MySql");

exports.execQuery = async function (query) {
  let returnValue = [];
  const conn = await MySql.connection();

  try {
    await conn.query("START TRANSACTION");
    returnValue = await conn.query(query);
    await conn.query("COMMIT");
  } catch (err) {
    await conn.query("ROLLBACK");
    console.log('ROLLBACK at query execution', err);
    throw err;
  } finally {
    await conn.release();
  }

  return returnValue;
};
