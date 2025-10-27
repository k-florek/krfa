import { defineEventHandler } from 'h3'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { SquareClient, SquareEnvironment } = require('square');

const client = new SquareClient({
    token: process.env.SQUARE_ACCESS_TOKEN,
    environment: SquareEnvironment.Sandbox //SquareEnvironment.Sandbox or SquareEnvironment.Production
});

export default defineEventHandler(async () => {
  try {
    const response = await client.catalog.list({types:"ITEM"})   
    const serializedData = response.data.map((item: any) => {
      const serializedItem = JSON.parse(JSON.stringify(item, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));
      return serializedItem;
    });
    return serializedData || []
  } catch (error: any) {
    console.log(error.message);
    return { error: error?.message || 'An error occurred' }
  }
})
