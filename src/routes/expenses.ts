import { EnvApp } from '../types/Bindings';
import { authenticateToken } from '../middleware/authenticate';
import { Context, Hono } from 'hono';
import { expenseData } from '../types/expenseTypes';
import { categoryExists, updatedAmount, findBudgetData, findTask } from '../utils/expenses';
import { HTTPException } from 'hono/http-exception';

const expense = new Hono<EnvApp>();

//Route for getting expenses for a user:
expense.get('/expenses', authenticateToken, async (c) => {
	const user_id = c.get('userId');
	//Look in the db the expenses of a user
	try {
		const expenses = await c.env.DB.prepare(`SELECT * FROM expenses WHERE user_id = ?`).bind(user_id).all();

		return c.json(expenses.results);
	} catch (err) {
		if (err instanceof Error) {
			throw new Error(err.message);
		}
	}
});

//Adding expense
expense.post('/expenses', authenticateToken, async (c) => {
		const id = parseInt(c.get('userId'));
		const username = c.get('username');
		const data: expenseData = await c.req.json();
		const budgetData = await findBudgetData(c, username, data); //KV
		if(!budgetData){
			throw new HTTPException(404, {message: "No budget data found"})
		}
		const expenseData = await categoryExists(c, id, data); //D1
	
		//category exists
		if (expenseData) {
			const updateAmount = await updatedAmount(c, data, id, budgetData, expenseData.amount);
			if (!updateAmount.success) {
				throw new HTTPException(400, {message: 'Failed to update amount', cause: updateAmount.error})
			}
			return c.json({ success: true, message: 'Updated successfully' });
		}
	
		const createExpense = await c.env.DB.prepare(`INSERT INTO expenses(user_id, category, amount) VALUES (?1, ?2, ?3)`)
			.bind(id, data.category, data.amount)
			.run();
	
		if (!createExpense.success) {
			throw new HTTPException(400, {message: "Failed to create expense"})
		}
		return c.json(createExpense);

});

//Editing expenses
expense.put('/expenses/:taskId', authenticateToken, async (c) => {
	const { taskId } = c.req.param();
	const user_id = c.get('userId');
	const username = c.get('username');
	const data: expenseData = await c.req.json();
	const task = findTask(c, taskId, user_id);

	if (!task) {
		throw new HTTPException(400, {message:"No task found", })
	}

	//Check if the task is less than the limit in kv
	const limitData = await findBudgetData(c, username, data);
	if (!limitData) {
		throw new HTTPException(400, {message: "Cannot find budget data"})
	}

	if (data.amount <= limitData.limit) {
		const updatedTask = await c.env.DB.prepare(`UPDATE expenses SET amount = ?, category = ? WHERE id = ? AND user_id = ?`)
			.bind(data.amount, data.category, taskId, user_id)
			.run();
		if (!updatedTask.success) {
			throw new HTTPException(400,{message: "Failed to update task"})
		}

		return c.json(updatedTask);
	}
	throw new HTTPException(400, {message: "Amount should not limit the budget"})
});

//Deleting expenses
expense.delete('/expenses/:taskId', authenticateToken, async (c) => {
	const { taskId } = c.req.param();
	const user_id = c.get('userId');
	const task = findTask(c, taskId, user_id);
	if (!task) {
		throw new HTTPException(400, {message: "Task not found"});
	}
	const deletedTask = await c.env.DB.prepare(`DELETE FROM expenses WHERE id = ? AND user_id = ?`).bind(taskId, user_id).run();
	if (!deletedTask.success) {
		throw new HTTPException(400, {message: "Failed to detele task"})
	}
	return c.json(deletedTask.results);
});

expense.get('/download-csv', async(c)=>{
	const data = [
        { name: 'John Doe', age: 28, email: 'johndoe@example.com' },
        { name: 'Jane Doe', age: 25, email: 'janedoe@example.com' },
        { name: 'Jim Brown', age: 35, email: 'jimbrown@example.com' }
    ];

	let csv = 'Name,Age,Email\n';

	data.forEach(row => {
		csv += `${row.name},${row.age},${row.email}\n`; // Add each row
	})

	c.header('Content-Type', 'text/csv');
	c.header('Content-Disposition', 'attachment; filename="data.csv"')
	return c.text(csv);
})


//EXPENSE SEARCH AND FILTERING
// 4. Expense Analysis and Reports
//     * Monthly/Weekly Reports: Automatically generate reports showing a breakdown of user spending by category, the total spent, and remaining budget. This data can be fetched using Worker APIs and stored in D1.
//     * CSV Export: Allow users to export their expenses to a CSV file. Cloudflare Workers can generate this file on demand, including all relevant details (category, amount, date) and return it as a download link.

export default expense;
