import { algoliasearch } from 'algoliasearch';

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID!;
const ALGOLIA_SEARCH_KEY = process.env.ALGOLIA_SEARCH_API_KEY!;

const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

export { client as algolia };
export const RECIPE_INDEX = 'recipes';
