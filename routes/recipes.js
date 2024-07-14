var express = require("express");
var router = express.Router();
const recipes_utils = require("./utils/recipes_utils");


router.get("/", (req, res) => res.send("im here"));


/**
 * Route to get a number of random recipes
 */
router.get("/randomRecipes", async (req, res, next) => {
  try {
    // Call the utility function to get a specified number of random recipes 
    const recipes = await recipes_utils.randomRecipes(3);

    // Respond with the random recipes
    res.send({"recipes": recipes});
  } catch (error) {
    next(error);
  }
});


/**
 * Route to search recipes based on different parameters
 */
router.get("/searchRecipes/:recipe_name/:amount_recipes/:sort/:cuisine/:diet/:intolerance", async (req, res, next) => {
  try {
    // Extract the search parameters from the request 
    const { recipe_name, amount_recipes, sort, cuisine, diet, intolerance } = req.params;

    // Call the utility function to search for recipes based on the given parameters 
    const searchResults  = await recipes_utils.searchRecipes(recipe_name,amount_recipes,sort, cuisine, diet, intolerance);
    
    res.status(200);
    res.send({"recipes":searchResults})
  } catch (error) {
    next(error);
  }
});


/**
 * This path returns a full details of a recipe by its id
 */
router.get("/:recipeId", async (req, res, next) => {
  try {
    const recipe = await recipes_utils.getRecipeInformation(req.params.recipeId);
    res.status(200);
    res.send({"recipe":recipe})
  } catch (error) {
    next(error);
  }
});

module.exports = router;