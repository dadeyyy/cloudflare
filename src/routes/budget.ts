import { Hono } from "hono";
import { EnvApp } from "../types/Bindings";
import { authenticateToken } from "../middleware/authenticate";
import { DataBudgetType } from "../types/BudgetType";

const budget = new Hono<EnvApp>()

budget.post('/set-budget', authenticateToken, async(c)=>{
    const data: DataBudgetType = await c.req.json();
    const username = c.get('username');
    console.log(username);
    //Set the budget to the kv
    try{
        await c.env.kvCloudflare.put(`${username}:budget`, JSON.stringify(data));
        return c.json({ success: true, message: 'Budget set successfully!' });
    }
    catch(err){
        console.log(err);
        throw new Error('Failed to add budget!')
    }
})

export default budget;