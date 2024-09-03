const axios = require("axios");
const api_domain = "https://api.spoonacular.com/recipes";
const DButils = require("./DButils");


/**
 * Get recipes list from spooncular response and extract the relevant recipe data for preview
 * @param {*} recipes_info 
 */


//------------------------------------ Get Details of Single Recipe Functions -------------------------------------------

/**
 * Gets full information about a recipe from Spoonacular API.
 * @param {number} recipe_id - The ID of the recipe to retrieve information for.
 * @returns {Promise<Object>} - A promise that resolves with the recipe information.
 */
async function getRecipeInformation(recipe_id) {
  try {
    const response = await axios.get(`${api_domain}/${recipe_id}/information`, {
      params: {
        includeNutrition: false,
        apiKey: process.env.APIKEYSPOON
      }
    });

    const {
      id,
      title,
      readyInMinutes,
      image,
      servings,
      aggregateLikes,
      vegan,
      summary,
      vegetarian,
      glutenFree,
      extendedIngredients,
      analyzedInstructions
    } = response.data;

    const ingredient_list = extendedIngredients.map((ingredient) => {
      const { name, measures: { us: { amount, unitLong } } } = ingredient;
      return { name, amount, unitLong };
    });

    const instruct_list = analyzedInstructions.map((instruction) => {
      const steps = instruction.steps.map((step) => step.step);
      return { steps };
    });

    return {
      recipe_id: id,
      recipe_name: title,
      prepare_time: readyInMinutes,
      image_recipe: image,
      portions: servings,
      likes: aggregateLikes,
      is_vegan: vegan,
      summary: summary.replace(/<[^>]*>/g, '') // Remove all HTML tags
      .split(/(?<=\.)/)[0], // Take the first sentence
      is_vegeterian: vegetarian,
      is_glutenFree: glutenFree,
      recipe_ingredient: ingredient_list,
      recipe_instruction: instruct_list
    };
  } catch (error) {
    console.error("Error fetching recipe information:", error);
    throw error;
  }
}
/**
 * Extracts relevant recipe data from the Spoonacular response for preview page.
 * @param {number} recipe_id - The ID of the recipe to retrieve preview details for.
 * @returns {Promise<Object>} - A promise that resolves with an object containing the relevant recipe data for preview.
 */
async function getRecipePreviewDetails(recipe_id) {
    let recipe_info = await getRecipeInformation(recipe_id);
    let { recipe_name, prepare_time, image_recipe, likes, is_vegan, is_vegeterian, is_glutenFree } = recipe_info;

    return {
      recipe_id,
      recipe_name,
      prepare_time,
      image_recipe,
      likes,
      is_vegan,
      is_vegeterian,
      is_glutenFree
    };
}

//------------------------------------ Get Details of Recipes List Functions -------------------------------------------

/**
 * Extracts relevant recipe data for a list of recipe IDs for preview.
 * @param {Array<number>} recipes_id_array - The list of recipe IDs to retrieve preview details for.
 * @returns {Promise<Array<Object>>} - A promise that resolves with an array of recipe objects with relevant data for preview.
 */
async function getRecipesPreviewDetails(recipes_id_array) {

  // check if the type is family or personal or api ... and then return 
  const previewDetailsPromises = recipes_id_array.map(id => getRecipePreviewDetails(id));
  const recipesPreviews = await Promise.all(previewDetailsPromises);
  return recipesPreviews;
}

/**
 * Extracts relevant recipe data from for a list of recipe from the spoonacular response for full page.
 * @param {Array} recipes_info - The list of recipe objects from the spoonacular response.
 * @returns {Promise<Array>} - A promise that resolves with an array of recipe objects with relevant data for preview.
 */
async function getRecipesFullDetails(recipes_list) {
    const promises = recipes_list.map(async (recipe) => {
      const { id, title, readyInMinutes, image, servings, aggregateLikes, extendedIngredients, analyzedInstructions, vegan, vegetarian, glutenFree } = recipe;
  
      const ingredient_list = extendedIngredients.map((ingredient) => {
        const { name, measures: { us: { amount, unitLong } } } = ingredient;
        return { name, amount, unitLong };
      });
  
      const instruct_list = analyzedInstructions.map((instruction) => {
        const steps = instruction.steps.map((step) => step.step);
        return { steps };
      });
  
      return {
        recipe_id: id,
        recipe_name: title,
        prepare_time: readyInMinutes,
        image_recipe: image,
        portions: servings,
        likes: aggregateLikes,
        is_vegan: vegan,
        is_vegeterian: vegetarian,
        is_glutenFree: glutenFree,
        recipe_ingredient: ingredient_list,
        recipe_instruction: instruct_list
      };
    });
  
    // wait for performing asynchronous operations to extract and format recipe data
    const recipes_final = await Promise.all(promises);
    return recipes_final;
  }

  
//------------------------------------ Random Recipes Functions -------------------------------------------

/**
 * Function to fetch a specified number of random recipes
 * @param {number} numberOfRecipes - The number of random recipes to fetch
 * @returns {Promise<Array>} - A promise that resolves to an array of random recipes
 */
async function randomRecipes(numberOfRecipes) {
    let response = await handleRandomRecipe(numberOfRecipes);
    let random_recipes = await getRecipesFullDetails(response.data.recipes);

    return random_recipes;
  }

  

  /**
 * Retrieves a random recipes's information from the spoonacular API.
 * @param {number} number - The number of random recipes to retrieve.
 * @returns {Promise<Object>} - A promise that resolves with the response data containing the random recipes.
 */
async function handleRandomRecipe(number) {
    return await axios.get(`${api_domain}/random`, {
        params: {
            number:number,
            apiKey: process.env.APIKEYSPOON

        }
    });
}


//------------------------------------ Search Recipes Functions -------------------------------------------

/**
 * Searches for recipes based on various parameters and returns the results.
 * @param {string} recipe_name - The name of the recipe to search for.
 * @param {number} amount_recipes - The number of recipes to retrieve.
 * @param {string} sort - The sorting criteria.
 * @param {string} cuisine - The type of cuisine to filter by.
 * @param {string} diet - The type of diet to filter by.
 * @param {string} intolerance - The type of intolerance to filter by.
 * @returns {Promise<Array>} - A promise that resolves with an array of recipe results.
 */
async function searchRecipes(recipe_name, amount_recipes, sort, cuisine, diet, intolerance) {
    const APIresponse = await axios.get(`${api_domain}/complexSearch`, {
      params: {
        query: recipe_name,
        number: amount_recipes,
        sort: sort,
        cuisine: cuisine,
        diet: diet,
        intolerances: intolerance,
        apiKey: process.env.APIKEYSPOON
      }
    });

    // Extract the IDs of the searched recipes
    const RecipesIdList = APIresponse.data.results.map(result => result.id);
    const previewDetailsPromises = RecipesIdList.map(id => getRecipePreviewDetails(id));

    // Wait for all the promises to resolve
    const recipes = await Promise.all(previewDetailsPromises);
    return recipes;
  }



exports.getRecipePreviewDetails = getRecipePreviewDetails;
exports.getRecipesPreviewDetails = getRecipesPreviewDetails;

exports.getRecipeInformation = getRecipeInformation;
exports.randomRecipes = randomRecipes;
exports.searchRecipes = searchRecipes;
