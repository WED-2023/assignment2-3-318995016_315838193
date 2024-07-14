const DButils = require("./DButils");
const recipe_utils = require("./recipes_utils");

//------------------------------------ Get Personal / Family , Full / Preview Recipes Functions -------------------------------------------

/**
 * Function to get recipes based on the type and category (personal/family)
 * @param {string} user_name - The name of the user
 * @param {string} category - The category of recipes ('personal' or 'family')
 * @returns {Promise<Array>} - A promise that resolves to an array of recipes
 */
async function getRecipes(user_name, category) {
    const recipes_id = await DButils.execQuery(`SELECT recipe_id FROM ${category}recipes WHERE user_name='${user_name}'`);
    const ids = recipes_id.map(item => item.recipe_id);
    // Get basic recipe information
    return await getPreviewRecipes(ids, category);
}

/**
 * Function to get basic recipe information in the same structure as full
 * @param {Array} recipes_id_list - A list of recipe IDs
 * @param {string} category - The category of recipes ('personal' or 'family')
 * @returns {Promise<Array>} - A promise that resolves to an array of basic recipes
 */
async function getPreviewRecipes(recipes_id_list, category) {
    const promises = recipes_id_list.map((recipe_id) => {
        return DButils.execQuery(`SELECT * FROM ${category}recipes WHERE recipe_id=${recipe_id}`);
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
 * Function to handle full recipes by their IDs and category
 * @param {string} recipe_id - A recipe ID
 * @param {string} category - The category of recipes ('personal' or 'family')
 * @returns {Promise<Object>} - A promise that resolves to a detailed recipe
 */
async function getFullRecipe(recipe_id, category) {
    const result_recipe = await DButils.execQuery(`SELECT * FROM ${category}recipes WHERE recipe_id=${recipe_id}`);
    const result_ingre = await DButils.execQuery(`SELECT ingredient_name, amount, unitLong FROM ingredients WHERE recipe_id=${recipe_id}`);
    const result_steps = await DButils.execQuery(`SELECT step_description FROM instructions WHERE recipe_id=${recipe_id} ORDER BY instruction_id`);

    const recipe_details = await getRecipeDetails(result_recipe[0], result_ingre, result_steps, category);
    return recipe_details;
}

/**
 * Function to get detailed recipe information
 * @param {Object} recipe - Recipe data
 * @param {Array} ingre - List of ingredients
 * @param {Array} steps - List of steps
 * @param {string} category - The category of recipes ('personal' or 'family')
 * @returns {Promise<Object>} - A promise that resolves to a formatted recipe
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
 * Function to create and save a personal recipe
 * @param {string} user_name - The name of the user
 * @param {string} recipe_name - The name of the recipe
 * @param {string} image_recipe - The image of the recipe
 * @param {number} prepare_time - The preparation time of the recipe
 * @param {number} likes - The number of likes
 * @param {boolean} is_vegan - Whether the recipe is vegan
 * @param {boolean} is_vegeterian - Whether the recipe is vegetarian
 * @param {boolean} is_glutenFree - Whether the recipe is gluten-free
 * @param {string} summary - The summary of the recipe
 * @param {string} RecipesInstructions - The instructions for the recipe
 * @param {Array} RecipesIngredients - The ingredients for the recipe
 * @param {number} portions - The number of portions
 * @returns {Promise<void>}
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
    portions
) {
    try {
        // Insert the recipe into the PersonalRecipes table
        const result = await DButils.execQuery(`
            INSERT INTO personalrecipes 
            (user_name, recipe_name, image_recipe, prepare_time, likes, is_vegan, is_vegeterian, is_glutenFree, summary, portions) 
            VALUES 
            ('${user_name}', '${recipe_name}', '${image_recipe}', ${prepare_time}, ${likes}, ${is_vegan}, ${is_vegeterian}, ${is_glutenFree}, '${summary}', ${portions})
        `);

        // Get the ID of the newly inserted recipe
        const recipe_id = result.insertId;

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
                INSERT INTO ingredients ()
                VALUES (${recipe_id}, '${ingredient.name}', ${ingredient.amount}, '${ingredient.unitLong}')
            `);
        }
    } catch (error) {
        throw new Error('Failed to create personal recipe: ' + error.message);
    }
}



//------------------------------------ Create Family Recipes Functions -------------------------------------------


/**
 * Function to create and save a family recipe
 * @param {string} user_name - The name of the user
 * @param {string} recipe_name - The name of the recipe
 * @param {string} image_recipe - The image of the recipe
 * @param {number} prepare_time - The preparation time of the recipe
 * @param {number} likes - The number of likes
 * @param {boolean} is_vegan - Whether the recipe is vegan
 * @param {boolean} is_vegeterian - Whether the recipe is vegetarian
 * @param {boolean} is_glutenFree - Whether the recipe is gluten-free
 * @param {string} who_made - The name of who made the family recipe.
 * @param {string} when_prepare- Information about when the family recipe is usually prepared.
 * @param {string} summary - The summary of the recipe
 * @param {string} RecipesInstructions - The instructions for the recipe
 * @param {Array} RecipesIngredients - The ingredients for the recipe
 * @param {number} portions - The number of portions
 * @returns {Promise<void>}
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
    portions
) {
    try {
        // Insert the recipe into the familyRecipes table
        const result = await DButils.execQuery(`
            INSERT INTO familyrecipes 
            (user_name, recipe_name, image_recipe, prepare_time, likes, is_vegan, is_vegeterian, is_glutenFree, summary, portions, who_made, when_prepare) 
            VALUES 
            ('${user_name}', '${recipe_name}', '${image_recipe}', ${prepare_time}, ${likes}, ${is_vegan}, ${is_vegeterian}, ${is_glutenFree}, '${summary}', ${portions}, '${who_made}', '${when_prepare}')
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
 * Function to update the viewed recipes for the logged-in user
 * @param {string} user_name - The name of the user
 * @param {number} recipe_id - The ID of the recipe
 * @param {string} recipe_type - The type of the recipe
 * @returns {Promise<void>}
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

async function markAsFavorite(user_name, recipe_id, recipe_type) {
    await DButils.execQuery(`insert into favoriterecipes (user_name, recipe_id, recipe_type) values ('${user_name}',${recipe_id}, '${recipe_type}')`);
}


//------------------------------------ Get Recipes By Type Functions -------------------------------------------

/**
 * Function to get all the recipes viewed by the user
 * @param {string} table_name - The name of the table
 * @param {string} user_name - The name of the user
 * @param {string} display_type - The type of display ("full" or other)
 * @param {number} limit - The number of recipes to retrieve (0 for all)
 * @param {string} [recipe_id] - Optional recipe ID to filter by
 * @returns {Promise<Array>} - A promise that resolves to an array of viewed recipes id and type
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
 * Categorize recipes by their type
 * @param {Array} recipes - Array of viewed recipes id and type
 * @returns {Object} - Object containing arrays of recipe IDs categorized by type
 */
function categorizeRecipesByType(recipes) {
    const familyRecipeIds = [];
    const personalRecipeIds = [];
    const apiRecipeIds = [];

    recipes.forEach(recipe => {
        if (recipe.recipe_type === "family") {
            familyRecipeIds.push(recipe.recipe_id);
        } else if (recipe.recipe_type === "personal") {
            personalRecipeIds.push(recipe.recipe_id);
        } else if (recipe.recipe_type === "api") {
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