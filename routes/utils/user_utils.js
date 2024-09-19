const DButils = require("./DButils");
const recipe_utils = require("./recipes_utils");

//------------------------------------ Get Personal / Family , Full / Preview Recipes Functions -------------------------------------------

/**
 * Retrieves a list of either personal or family recipes for a user.
 * It first retrieves the recipe IDs and then uses those to get the recipe previews.
 * 
 * @param {string} user_name - The name of the user.
 * @param {string} category - The category of the recipes ('personal' or 'family').
 * @returns {Promise<Array>} - A promise that resolves to an array of recipe previews.
 */
async function getRecipes(user_name, category) {
    const recipes_id = await DButils.execQuery(`SELECT recipe_id FROM recipes WHERE user_name='${user_name}' AND recipe_type ='${category}'`);
    const ids = recipes_id.map(item => item.recipe_id);
    // Get basic recipe information
    return await getPreviewRecipes(ids, category);
}

/**
 * Fetches basic information for a list of recipes, including name, preparation time, and other basic properties.
 * 
 * @param {Array} recipes_id_list - A list of recipe IDs to fetch.
 * @param {string} category - The category of the recipes ('personal' or 'family').
 * @returns {Promise<Array>} - A promise that resolves to an array of basic recipe information.
 */
async function getPreviewRecipes(recipes_id_list, category) {
    const promises = recipes_id_list.map((recipe_id) => {
        return DButils.execQuery(`SELECT * FROM recipes WHERE recipe_id=${recipe_id} AND recipe_type='${category}'`);
    });
    const recipes_p_list = await Promise.all(promises);

    return recipes_p_list.map(recipe => {
        const result_recipe = recipe[0];
        const recipe_details = {
            recipe_id: result_recipe.recipe_id,
            recipe_name: result_recipe.recipe_name,
            prepare_time: result_recipe.prepare_time,
            image_recipe: result_recipe.image_recipe,
            portions: result_recipe.portions,
            likes: result_recipe.likes,
            is_vegan: result_recipe.is_vegan,
            is_vegeterian: result_recipe.is_vegeterian,
            is_glutenFree: result_recipe.is_glutenFree,
            summary: result_recipe.summary
        };

        if (category === 'family') {
            recipe_details.who_made = result_recipe.who_made;
            recipe_details.when_prepare = result_recipe.when_prepare;
        }

        return recipe_details;
    });
}


/**
 * Retrieves the full details of a recipe, including ingredients and instructions.
 * 
 * @param {string} recipe_id - The ID of the recipe.
 * @param {string} category - The category of the recipe ('personal' or 'family').
 * @returns {Promise<Object>} - A promise that resolves to an object containing the full recipe details, ingredients, and instructions.
 */
async function getFullRecipe(recipe_id, category) {
    const result_recipe = await DButils.execQuery(`SELECT * FROM recipes WHERE recipe_id=${recipe_id} AND recipe_type ='${category}'`);
    const result_ingre = await DButils.execQuery(`SELECT ingredient_name, amount, unitLong FROM ingredients WHERE recipe_id=${recipe_id}`);
    const result_steps = await DButils.execQuery(`SELECT step_description FROM instructions WHERE recipe_id=${recipe_id} ORDER BY instruction_id`);

    const recipe_details = await getRecipeDetails(result_recipe[0], result_ingre, result_steps, category);
    return recipe_details;
}


/**
 * Helper function to format the full recipe details, including ingredients and instructions.
 * 
 * @param {Object} recipe - Recipe object containing basic recipe information.
 * @param {Array} ingre - List of ingredients related to the recipe.
 * @param {Array} steps - List of instructions or steps for the recipe.
 * @param {string} category - The category of the recipe ('personal' or 'family').
 * @returns {Promise<Object>} - A promise that resolves to a formatted recipe object.
 */
async function getRecipeDetails(recipe, ingre, steps, category) {
    const ingredient_list = ingre.map((ingredient) => ({
        name: ingredient.ingredient_name,
        amount: ingredient.amount,
        unitLong: ingredient.unitLong
    }));

    const steps_list = [{ "steps": steps.map((step) => step.step_description) }];

    const recipe_details = {
        recipe_id: recipe.recipe_id,
        recipe_name: recipe.recipe_name,
        prepare_time: recipe.prepare_time,
        image_recipe: recipe.image_recipe,
        portions: recipe.portions,
        likes: recipe.likes,
        summary: recipe.summary,
        is_vegan: recipe.is_vegan,
        is_vegeterian: recipe.is_vegeterian,
        is_glutenFree: recipe.is_glutenFree,
        recipe_ingredient: ingredient_list,
        recipe_instruction: steps_list
    };

    if (category === 'family') {
        recipe_details.who_made = recipe.who_made;
        recipe_details.when_prepare = recipe.when_prepare;
    }

    return recipe_details;
}

//------------------------------------ Create Personal Recipes Functions -------------------------------------------
/**
 * Creates a personal recipe and stores it in the database. Also stores the related ingredients and instructions.
 * 
 * @param {string} user_name - The name of the user creating the recipe.
 * @param {string} recipe_name - The name of the recipe.
 * @param {string} image_recipe - The image of the recipe.
 * @param {number} prepare_time - Preparation time in minutes.
 * @param {number} likes - Initial number of likes (default is 0).
 * @param {boolean} is_vegan - Whether the recipe is vegan.
 * @param {boolean} is_vegeterian - Whether the recipe is vegetarian.
 * @param {boolean} is_glutenFree - Whether the recipe is gluten-free.
 * @param {string} summary - A short description or summary of the recipe.
 * @param {Array} RecipesInstructions - A list of instructions for preparing the recipe.
 * @param {Array} RecipesIngredients - A list of ingredients for the recipe.
 * @param {number} portions - Number of portions the recipe makes.
 * @param {string} recipe_type - The type of recipe ('personal').
 * @returns {Promise<void>} - A promise that resolves when the recipe is successfully created.
 */
async function createPersonalRecipe(
    user_name,
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
) {
    try {
        // Start a transaction
        await DButils.execQuery("START TRANSACTION");

        // Insert the recipe into the PersonalRecipes table
        const result = await DButils.execQuery(`
            INSERT INTO recipes 
            (user_name, recipe_name, image_recipe, prepare_time, likes, is_vegan, is_vegeterian, is_glutenFree, summary, portions, recipe_type) 
            VALUES 
            ('${user_name}', '${recipe_name.replace(/'/g, "''")}', '${image_recipe.replace(/'/g, "''")}', ${prepare_time}, ${likes}, ${is_vegan}, ${is_vegeterian}, ${is_glutenFree}, '${summary.replace(/'/g, "''")}', ${portions}, '${recipe_type.replace(/'/g, "''")}')
        `);

        // Get the ID of the newly inserted recipe
        const recipe_id = result.insertId;

        // Insert each instruction into the instructions table
        let instruction_id = 1;
        const steps = RecipesInstructions.map((step_description) => {
            const step = `(${recipe_id}, ${instruction_id}, '${step_description.replace(/'/g, "''")}')`;
            instruction_id++;
            return step;
        });
        const insertInstructionsQuery = `INSERT INTO instructions (recipe_id, instruction_id, step_description) VALUES ${steps.join(", ")}`;
        await DButils.execQuery(insertInstructionsQuery);

        // Insert the ingredients into the Ingredients table
        for (const ingredient of RecipesIngredients) {
            // Log ingredient for debugging
            console.log('Inserting ingredient:', ingredient);

            // Insert ingredient with SQL escaping to avoid syntax issues
            await DButils.execQuery(`
                INSERT INTO ingredients (recipe_id, ingredient_name, amount, unitLong)
                VALUES (${recipe_id}, '${ingredient.name.replace(/'/g, "''")}', ${ingredient.amount}, '${ingredient.unitLong.replace(/'/g, "''")}')
            `);
        }

        // Commit the transaction
        await DButils.execQuery("COMMIT");
    } catch (error) {
        // Rollback transaction in case of error
        await DButils.execQuery("ROLLBACK");
        throw new Error('Failed to create personal recipe: ' + error.message);
    }
}




//------------------------------------ Create Family Recipes Functions -------------------------------------------


/**
 * Creates a family recipe with extra details such as who made it and when it's typically prepared.
 * 
 * @param {string} user_name - The name of the user creating the recipe.
 * @param {string} recipe_name - The name of the recipe.
 * @param {string} image_recipe - The image of the recipe.
 * @param {number} prepare_time - Preparation time in minutes.
 * @param {number} likes - Initial number of likes (default is 0).
 * @param {boolean} is_vegan - Whether the recipe is vegan.
 * @param {boolean} is_vegeterian - Whether the recipe is vegetarian.
 * @param {boolean} is_glutenFree - Whether the recipe is gluten-free.
 * @param {string} summary - A short description or summary of the recipe.
 * @param {Array} RecipesInstructions - A list of instructions for preparing the recipe.
 * @param {Array} RecipesIngredients - A list of ingredients for the recipe.
 * @param {number} portions - Number of portions the recipe makes.
 * @param {string} recipe_type - The type of recipe ('family').
 * @param {string} who_made - The name of the person who made the family recipe.
 * @param {string} when_prepare - The time or occasion when the family recipe is usually prepared.
 * @returns {Promise<void>} - A promise that resolves when the family recipe is successfully created.
 */
async function createFamilyRecipe(
    user_name,
    recipe_name,
    image_recipe,
    prepare_time,
    likes,
    is_vegan,
    is_vegeterian,
    is_glutenFree,
    who_made,
    when_prepare,
    summary,
    RecipesInstructions,
    RecipesIngredients,
    portions,
    recipe_type
) {
    try {
        // Insert the recipe into the familyRecipes table
        const result = await DButils.execQuery(`
            INSERT INTO recipes 
            (user_name, recipe_name, image_recipe, prepare_time, likes, is_vegan, is_vegeterian, is_glutenFree, summary, portions, who_made, when_prepare, recipe_type) 
            VALUES 
            ('${user_name}', '${recipe_name}', '${image_recipe}', ${prepare_time}, ${likes}, ${is_vegan}, ${is_vegeterian}, ${is_glutenFree}, '${summary}', ${portions}, '${who_made}', '${when_prepare}','${recipe_type}')
        `);

        // Get the ID of the newly inserted recipe
        const recipe_id = result.insertId;


        // Insert each instruction into the instructions table
        let instruction_id = 1;

        const steps = RecipesInstructions.map((step_description) => {
            const step = `(${recipe_id}, ${instruction_id}, '${step_description.replace(/'/g, "''")}')`;
            instruction_id++;
            return step;
        });

        const insertInstructionsQuery = `INSERT INTO instructions (recipe_id, instruction_id, step_description) VALUES ${steps.join(", ")}`;
        await DButils.execQuery(insertInstructionsQuery);


        // Insert the ingredients into the Ingredients table
        for (const ingredient of RecipesIngredients) {
            await DButils.execQuery(`
                INSERT INTO ingredients (recipe_id, ingredient_name, amount, unitLong)
                VALUES (${recipe_id}, '${ingredient.name}', ${ingredient.amount}, '${ingredient.unitLong}')
            `);
        }
    } catch (error) {
        throw new Error('Failed to create personal recipe: ' + error.message);
    }

}

//------------------------------------ Last Viewed Recipes Functions -------------------------------------------

/**
 * Adds or updates the last viewed recipe for a user. If the recipe has already been viewed, it updates the timestamp.
 * 
 * @param {string} user_name - The name of the user.
 * @param {number} recipe_id - The ID of the viewed recipe.
 * @param {string} recipe_type - The type of the recipe (e.g., 'personal', 'family', 'api').
 * @returns {Promise<void>} - A promise that resolves when the viewed recipe is successfully recorded or updated.
 */
async function putViewedRecipes(user_name, recipe_id, recipe_type) {
    try {
        // Insert or update the viewed recipe for the user
        await DButils.execQuery(`
        INSERT INTO viewedrecipes (user_name, recipe_id, recipe_type, view_at)
        VALUES ('${user_name}', ${recipe_id}, '${recipe_type}', NOW())
        ON DUPLICATE KEY UPDATE
        view_at = NOW()
      `);
    } catch (error) {
        throw new Error('Failed to update viewed recipes: ' + error.message);
    }
}


//------------------------------------ Favorite Recipes Functions -------------------------------------------

/**
 * Marks a recipe as a favorite for a user and increments the likes count for that recipe.
 * 
 * @param {string} user_name - The name of the user marking the recipe as a favorite.
 * @param {number} recipe_id - The ID of the recipe to be marked as favorite.
 * @param {string} recipe_type - The type of the recipe (can be 'personal', 'family', or 'random').
 * @returns {Promise<void>} - A promise that resolves when the recipe is marked as a favorite.
 */
async function markAsFavorite(user_name, recipe_id, recipe_type) {
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
    if(recipe_type === "api"  || recipe_type === "random") return

    // Increment the likes for the recipe in the database
    await DButils.execQuery(`
        UPDATE recipes 
        SET likes = likes + 1 
        WHERE recipe_id = ${recipe_id} AND recipe_type='${recipe_type}'
    `);

    // Insert the recipe into the user's favorites
    await DButils.execQuery(`
        INSERT INTO favoriterecipes (user_name, recipe_id, recipe_type) 
        VALUES ('${user_name}', ${recipe_id}, '${recipe_type}')
    `);
}



//------------------------------------ Get Recipes By Type Functions -------------------------------------------

/**
 * Retrieves recipes viewed by the user, either in full or preview form.
 * 
 * @param {string} table_name - The name of the table from which to retrieve recipes.
 * @param {string} user_name - The name of the user.
 * @param {string} display_type - The type of display ('full' for detailed recipes or other for preview).
 * @param {number} limit - The number of recipes to retrieve (default is 0 for all).
 * @param {string} [recipe_id] - (Optional) If provided, fetches recipes filtered by this specific recipe ID.
 * @returns {Promise<Array>} - A promise that resolves to an array of viewed recipes (with either full or preview details).
 */
async function getViewedRecipes(table_name, user_name, display_type, limit = 0, recipe_id) {
    try {
        // Construct the SQL query
        let query = `
            SELECT recipe_id, recipe_type
            FROM ${table_name}
            WHERE user_name='${user_name}'
        `;

        // Add recipe_id to the query if provided
        if (recipe_id) {
            query += ` AND recipe_id='${recipe_id}'`;
        }

        // Add ordering if the table is 'viewedrecipes'
        if (table_name === 'viewedrecipes') {
            query += ` ORDER BY view_at DESC`;
        }

        // Add limit if specified
        if (limit > 0) {
            query += ` LIMIT ${limit}`;
        }

        // Execute the query and return the results
        const viewed_recipes_id_and_type = await DButils.execQuery(query);
        const { familyRecipeIds, personalRecipeIds, apiRecipeIds } = categorizeRecipesByType(viewed_recipes_id_and_type);

        const allRecipes = await fetchRecipeDetails(display_type, familyRecipeIds, personalRecipeIds, apiRecipeIds);
        return allRecipes;

    } catch (error) {
        throw new Error('Failed to retrieve viewed recipes: ' + error.message);
    }
}

/**
 * Categorizes a list of recipes by type (family, personal, or API).
 * 
 * @param {Array} recipes - An array of recipes with IDs and basic details.
 * @returns {Object} - An object categorizing the recipes by their type.
 */
function categorizeRecipesByType(recipes) {
    const familyRecipeIds = [];
    const personalRecipeIds = [];
    const apiRecipeIds = [];

    recipes.forEach(recipe => {
        if (recipe.recipe_type === "family" || recipe.recipe_type === "favorite") {
            familyRecipeIds.push(recipe.recipe_id);
        } else if (recipe.recipe_type === "personal") {
            personalRecipeIds.push(recipe.recipe_id);
        } else if (recipe.recipe_type === "random") {
            apiRecipeIds.push(recipe.recipe_id);
        }
    });

    return { familyRecipeIds, personalRecipeIds, apiRecipeIds };
}

/**
 * Fetch recipe details based on their type and display type
 * @param {string} display_type - The type of display ("full" or other)
 * @param {Array} familyRecipeIds - Array of family recipe IDs
 * @param {Array} personalRecipeIds - Array of personal recipe IDs
 * @param {Array} apiRecipeIds - Array of API recipe IDs
 * @returns {Promise<Array>} - A promise that resolves to an array of recipes with details
 */
async function fetchRecipeDetails(display_type, familyRecipeIds, personalRecipeIds, apiRecipeIds) {
    let familyRecipes = [];
    let personalRecipes = [];
    let apiRecipes = [];

    if (display_type === "full") {
        familyRecipes = familyRecipeIds.length > 0 ? [await getFullRecipe(familyRecipeIds, 'family')] : [];
        personalRecipes = personalRecipeIds.length > 0 ? [await getFullRecipe(personalRecipeIds, 'personal')] : [];
        apiRecipes = apiRecipeIds.length > 0 ? [await recipe_utils.getRecipeInformation(apiRecipeIds)] : [];
    } else {
        familyRecipes = familyRecipeIds.length > 0 ? await getPreviewRecipes(familyRecipeIds, 'family') : [];
        personalRecipes = personalRecipeIds.length > 0 ? await getPreviewRecipes(personalRecipeIds, 'personal') : [];
        apiRecipes = apiRecipeIds.length > 0 ? await recipe_utils.getRecipesPreviewDetails(apiRecipeIds) : [];
    }

    return [...familyRecipes, ...personalRecipes, ...apiRecipes];
}


exports.markAsFavorite = markAsFavorite;
exports.getRecipes = getRecipes;
exports.createPersonalRecipe = createPersonalRecipe;;
exports.createFamilyRecipe = createFamilyRecipe;
exports.getViewedRecipes = getViewedRecipes;
exports.putViewedRecipes = putViewedRecipes;
exports.getFullRecipe = getFullRecipe;