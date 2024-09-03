var express = require("express");
var router = express.Router();
const DButils = require("./utils/DButils");
const user_utils = require("./utils/user_utils");
const recipe_utils = require("./utils/recipes_utils");
const { body, validationResult } = require('express-validator');



//------------------------------------ Middleware Functions -----------------------------------------------

/**
 * Authenticate all incoming requests by middleware
 */
router.use(async function (req, res, next) {
  if (req.session && req.session.user_name) {
    DButils.execQuery("SELECT username FROM users").then((users) => {
      if (users.find((x) => x.username === req.session.user_name)) {
        req.user_name = req.session.user_name;
        next();
      }
    }).catch(err => next(err));
  } else {
    res.sendStatus(401);
  }
});



//------------------------------------ Personal Recipes Functions -------------------------------------------


/**
 * Route to get personal recipes for the logged-in user
 * If 'type' parameter is 'full', detailed recipe information is returned
 * If 'type' parameter is 'preview', only basic recipe information is returned
 */
router.get('/personalRecipes', async (req, res, next) => {  //preview
  try {
    const user_name = req.session.user_name;
    const type = req.params.display_type;

    // Get personal recipes based on the type
    const personal_recipes = await user_utils.getRecipes(user_name, 'personal');
    res.status(200).send({ "recipes": personal_recipes });
  } catch (error) {
    next(error);
  }
});


router.get('/personalRecipes/:recipe_id', async (req, res, next) => {  //full/id
  try {
    const user_name = req.session.user_name;
    const recipe_id = req.params.recipe_id;
    const personal_recipe = await user_utils.getFullRecipe(recipe_id, 'personal');
    res.status(200).send({ "recipe": personal_recipe });
  } catch (error) {
    next(error);
  }
});


router.post('/createPersonalRecipe',
  [
    body('recipe_name').isString().isLength({ max: 750 }),
    body('image_recipe').isString().isLength({ max: 750 }),
    body('prepare_time').isInt({ min: 1 }),
    body('likes').isInt({ min: 0 }),
    body('is_vegan').isBoolean(),
    body('is_vegeterian').isBoolean(),
    body('is_glutenFree').isBoolean(),
    body('summary').isString().isLength({ max: 1000 }),
    body('portions').isInt({ min: 1 }),
    body('RecipesInstructions').isArray(),  // Ensure this is validated as an array
    body('RecipesIngredients').isArray(),
    body('RecipesIngredients.*.name').isString().isLength({ max: 750 }),
    body('RecipesIngredients.*.amount').isNumeric(),
    body('RecipesIngredients.*.unitLong').isString().isLength({ max: 750 }),
    body('recipe_type').isString().isLength({ max: 50 }) // Validate recipe_type
  ],

  async (req, res, next) => {
    // Check for validation errors in the request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        recipe_name,
        image_recipe,
        prepare_time,
        likes,
        is_vegan,
        is_vegeterian,
        is_glutenFree,
        summary,
        RecipesInstructions,
        RecipesIngredients,
        portions,
        recipe_type
      } = req.body;

      const user_name = req.session.user_name;

      // Ensure RecipesInstructions is an array
      const instructionsArray = typeof RecipesInstructions === 'string'
        ? RecipesInstructions.split('.').map(step => step.trim()).filter(step => step.length > 0)
        : RecipesInstructions;

      // Call the utility function to create and save the personal recipe 
      await user_utils.createPersonalRecipe(
        user_name,
        recipe_name,
        image_recipe,
        prepare_time,
        likes,
        is_vegan,
        is_vegeterian,
        is_glutenFree,
        summary,
        instructionsArray,  // Pass the array
        RecipesIngredients,
        portions,
        recipe_type 
      );

      res.status(200).send("The Recipe successfully created as personal recipe");
    } catch (error) {
      console.error('Error creating personal recipe:', error);
      next(error);
    }
  });


//------------------------------------ Family Recipes Functions -------------------------------------------

/**
 * Route to get family recipes of the logged-in user
 */
router.get('/familyRecipes', async (req, res, next) => {
  try {
    const user_name = req.session.user_name;
    const type = req.params.display_type;

    // Get the family recipes of the user 
    const family_recipes = await user_utils.getRecipes(user_name, 'family');
    res.status(200).send({ "recipes": family_recipes });
  } catch (error) {
    next(error);
  }
});


router.get('/familyRecipes/:recipe_id', async (req, res, next) => {
  try {
    const user_name = req.session.user_name;
    const recipe_id = req.params.recipe_id;
    const family_recipe = await user_utils.getFullRecipe(recipe_id, 'family');
    res.status(200).send({ "recipe": family_recipe });
  } catch (error) {
    next(error);
  }
});

router.post('/createFamilyRecipe',
  [
    body('recipe_name').isString().isLength({ max: 750 }),
    body('image_recipe').isString().isLength({ max: 750 }),
    body('prepare_time').isInt({ min: 1 }),
    body('likes').isInt({ min: 0 }),
    body('is_vegan').isBoolean(),
    body('is_vegeterian').isBoolean(),
    body('is_glutenFree').isBoolean(),
    body('who_made').isString().isLength({ max: 750 }),
    body('when_prep').isString().isLength({ max: 750 }),
    body('summary').isString().isLength({ max: 1000 }),
    body('portions').isInt({ min: 1 }),
    body('RecipesInstructions').isArray(),  // Ensure this is validated as an array
    body('RecipesIngredients').isArray(),
    body('RecipesIngredients.*.name').isString().isLength({ max: 750 }),
    body('RecipesIngredients.*.amount').isNumeric(),
    body('RecipesIngredients.*.unitLong').isString().isLength({ max: 750 }),
    body('recipe_type').isString().isLength({ max: 50 }) // Validate recipe_type
  ],

  async (req, res, next) => {
    // Check for validation errors in the request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        recipe_name,
        image_recipe,
        prepare_time,
        likes,
        is_vegan,
        is_vegeterian,
        is_glutenFree,
        who_made,
        when_prep,
        summary,
        RecipesInstructions,
        RecipesIngredients,
        portions,
        recipe_type
      } = req.body;

      const user_name = req.session.user_name;

      // Ensure RecipesInstructions is an array
      const instructionsArray = typeof RecipesInstructions === 'string'
        ? RecipesInstructions.split('.').map(step => step.trim()).filter(step => step.length > 0)
        : RecipesInstructions;

      // Call the utility function to create and save the family recipe 
      await user_utils.createFamilyRecipe(
        user_name,
        recipe_name,
        image_recipe,
        prepare_time,
        likes,
        is_vegan,
        is_vegeterian,
        is_glutenFree,
        who_made,
        when_prep,
        summary,
        instructionsArray,  // Pass the array
        RecipesIngredients,
        portions,
        recipe_type 
      );

      res.status(200).send("The Recipe successfully created as family recipe");
    } catch (error) {
      console.error('Error creating family recipe:', error);
      next(error);
    }
  });



//------------------------------------ Favorite Recipes Functions -------------------------------------------

/**
 * This path gets body with recipeId and save this recipe in the favorites list of the logged-in user according to the type - personal/family/api
 */
router.post('/favoriteRecipes/:recipe_id/:recipe_type', async (req, res, next) => {
  try {
    const user_name = req.session.user_name;
    // Extract the recipe_id and recipe_type from the request parameters
    const { recipe_id, recipe_type } = req.params;
    await user_utils.markAsFavorite(user_name, recipe_id, recipe_type);
    res.status(200).send("The Recipe successfully saved as favorite");
  } catch (error) {
    next(error);
  }
})


/**
 * Route to get full details of a favorite recipe by its ID
 */
// router.get('/favoriteRecipes/:recipe_id', async (req, res, next) => {
//   try {
//     // Extract the user_name from the session
//     const user_name = req.session.user_name;
//     // Extract the display_type from the request parameters
//     const { recipe_id } = req.params;    
//     // Retrieve the last 3 viewed recipes by the user
//     const detailed_recipes = await user_utils.getViewedRecipes('favoriterecipes', user_name, 'full', 0, recipe_id);

//     // Send the detailed recipes as a JSON response
//     res.send({ recipe: detailed_recipes[0] });
//   } catch (error) {
//     // Pass any errors to the error handling middleware
//     next(error);
//   }
// });
router.get('/favoriteRecipes/:recipe_id/:recipe_type', async (req, res, next) => {
  try {
    const user_name = req.session.user_name;
    let { recipe_id, recipe_type } = req.params;
    let isFavorite = false;

    if (recipe_type === "last_viewed") {
      // Fetch the actual recipe type from the viewed recipes
      const result = await DButils.execQuery(`
          SELECT recipe_type
          FROM viewedrecipes
          WHERE recipe_id='${recipe_id}'
      `);

      // Ensure there is a result before assigning
      if (result.length > 0) {
        recipe_type = result[0].recipe_type;
      } else {
        throw new Error('Recipe type not found in last viewed recipes');
      }
    }

    if (recipe_type === "api" || recipe_type === "random" ||  recipe_type === "favorite") {
      isFavorite = true;
    } else {
      // Query the database to check if the recipe is in the user's favorites
      const result = await DButils.execQuery(`
        SELECT 1 FROM favoriterecipes 
        WHERE user_name='${user_name}' AND recipe_id=${recipe_id} AND recipe_type='${recipe_type}'
      `);

      // If the result has any rows, the recipe is a favorite
      isFavorite = result.length > 0;
    }
    const detailed_recipes = await user_utils.getViewedRecipes('favoriterecipes', user_name, 'full', 0, recipe_id);

    // Send the detailed recipes as a JSON response
    res.send({ recipe: detailed_recipes[0] , isFavorite:isFavorite});
    // res.send({ isFavorite });
  } catch (error) {
    next(error);
  }
});


/**
 * This path returns the favorites recipes that were saved by the logged-in user
 */


router.get("/favoriteRecipes", async (req, res, next) => {
  try {
    // Extract the user_name from the session
    const user_name = req.session.user_name;
    // Extract the display_type from the request parameters
    const display_type = req.params.display_type;
    // Retrieve the last 3 viewed recipes by the user
    const detailed_recipes = await user_utils.getViewedRecipes('favoriterecipes', user_name, 'preview', 0);

    // Send the detailed recipes as a JSON response
    res.send({ recipes: detailed_recipes });
  } catch (error) {
    // Pass any errors to the error handling middleware
    next(error);
  }
});



//------------------------------------ Last Viewed Recipes Functions -------------------------------------------


router.get("/lastViewedRecipes", async (req, res, next) => {
  try {
    // Extract the user_name from the session
    const user_name = req.session.user_name;
    // Retrieve the last 3 viewed recipes by the user
    const detailed_recipes = await user_utils.getViewedRecipes('viewedrecipes', user_name, 'preview', 3);

    // Send the detailed recipes as a JSON response
    res.send({ recipes: detailed_recipes });
  } catch (error) {
    // Pass any errors to the error handling middleware
    next(error);
  }
});



router.get('/lastViewedRecipes/:recipe_id', async (req, res, next) => {
  try {
    // Extract the user_name from the session
    const user_name = req.session.user_name;
    // Extract the display_type from the request parameters
    const { recipe_id} = req.params;
    // Retrieve the last 3 viewed recipes by the user
    const detailed_recipes = await user_utils.getViewedRecipes('viewedrecipes', user_name, 'full', 0, recipe_id);

        // Check if the recipe is not null to determine if it was viewed
        const isLastViewed = detailed_recipes.length > 0;
    // Send the detailed recipes as a JSON response
    res.send({ recipe: detailed_recipes[0] , isLastViewed });
  } catch (error) {
    // Pass any errors to the error handling middleware
    next(error);
  }
});



/**
 * Update the viewed recipes for the logged-in user according to the type - personal/family/api
 */
router.put("/lastViewedRecipes/:recipe_id/:recipe_type", async (req, res, next) => {
  try {
    // Extract the user_name from the session
    const user_name = req.session.user_name;

    // Extract the recipe_id and recipe_type from the request parameters
    const { recipe_id, recipe_type } = req.params;

    // Call the utility function to update the viewed recipes for the user
    await user_utils.putViewedRecipes(user_name, recipe_id, recipe_type);

    // Send a success response
    res.status(200).send('The recipe has been successfully marked as viewed.');
  } catch (error) {
    // Pass any errors to the error handling middleware
    next(error);
  }
});


module.exports = router;

