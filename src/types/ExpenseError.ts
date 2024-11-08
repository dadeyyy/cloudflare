export class ExpenseError extends Error {
    expenseErrorName: string;
    
    constructor(expenseErrorName: string) {
        super()
        this.expenseErrorName = expenseErrorName;
    }

    sayHello(){
        return "Hello!"
    }
}