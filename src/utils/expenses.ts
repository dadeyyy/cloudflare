import { Context } from 'hono';
import { expenseData } from '../types/expenseTypes';

type budgetDataTypes = {
	category: string;
	limit: number;
}[];

type budgetDataTypesObj = {
	category: string;
	limit: number;
};

type expenseDataTypes = {
	id: number;
	user_id: number;
	category: string;
	amount: number;
	date_created: string;
};

export const categoryExists = async (c: Context, userId: number, expenseData: expenseData): Promise<expenseDataTypes | null> => {
	// Prepare and execute the database query
	const expense = await c.env.DB.prepare('SELECT * FROM expenses WHERE category = ? AND user_id = ?')
		.bind(expenseData.category, userId)
		.first();

	// Return true if the category exists, otherwise false
	return expense || null;
};

export const updatedAmount = async (
	c: Context,
	data: expenseData,
	id: number,
	budgetData: budgetDataTypesObj,
	currentAmount: number
): Promise<{ success: boolean; result?: D1Result<Record<string, unknown>>; error?: string }> => {
	if (data.amount < 0) {
		return { success: false, error: 'Amount must be greater than 0' };
	}

	if (currentAmount + data.amount <= budgetData.limit) {
		const result = await c.env.DB.prepare('UPDATE expenses SET amount = amount + ? WHERE category = ? AND user_id = ?')
			.bind(data.amount, data.category, id)
			.run();

		return { success: true, result };
	}
	//set the amount to the limit
	else {
		const amountLimit = await c.env.DB.prepare(`UPDATE expenses SET amount = ? WHERE category = ? AND user_id = ?`)
			.bind(budgetData.limit, data.category, id)
			.run();

		return { success: true, result: amountLimit };
	}
};

export const findBudgetData = async (c: Context, username: string, data: expenseData): Promise<budgetDataTypesObj | null> => {
	const budget = await c.env.kvCloudflare.get(`${username}:budget`);
	const budgetData: budgetDataTypes = JSON.parse(budget);
	const categoryBudget = budgetData.find((b) => {
		b.category.toLowerCase() === data.category.toLowerCase();
	});

	return categoryBudget || null;
};

export const findTask = async (c: Context, taskId: string, user_id: string): Promise<Response> => {
	return await c.env.DB.prepare(`SELECT * FROM expenses WHERE user_id = ? AND id = ?`).bind(user_id, taskId).first();
};
