const express = require('express');
const { v4: uuid } = require('uuid')

const app = express();

app.use(express.json());

const customers = [];

//Middleware
function verifyExistsAccount(request, response, next) {
  const { cpf } = request.headers;

  const customer = customers.find(customer => customer.cpf === cpf);

  if (!customer) {
    return response.status(400).json({error: 'Cannot find customer'})
  }

  request.customer = customer;

  return next();
}

function getBalance(statement) {
  const balance = statement.reduce((accumulator, operation) => {
    if(operation.type === 'Credit') {
      return accumulator + operation.amount;
    } else {
      return accumulator - operation.amount;
    }
  }, 0)

  return balance;
}

app.post('/account', (request, response) => {
  const {cpf, name} = request.body;

  const customersAlreadyExist = customers.some((custumer) => custumer.cpf === cpf);

  if (customersAlreadyExist) {
    return response.status(400).json({message: 'Custumers already exist'})
  }
  
  const user = {
    cpf,
    name,
    id: uuid(),
    statement: [],
  }

  customers.push(user);

  return response.status(201).json({message: 'User created successfully.'})
})

app.get('/customers', (response) =>{
  const users = customers;
  return response.json(users);
})

app.get('/statement', verifyExistsAccount, (request, response) => {
  const { customer } = request;
  
  return response.json(customer.statement)
})

app.post('/deposit',verifyExistsAccount, (request, response) => {
  const { description, amount } = request.body;

  const { customer } = request;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: 'Credit'
  }

  customer.statement.push(statementOperation);

  return response.status(201).json({message: 'Amount deposit successfully.'});
})

app.post('/withdraw',verifyExistsAccount, (request, response) => {
  const { customer } = request;

  const { amount, description } = request.body;

  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return response.status(401).json({error: 'Insuficient funds.'})
  }

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: 'Debit'
  }

  customer.statement.push(statementOperation);

  return response.status(201).json({message: `Withdraw successfully in amount ${amount}`})
})

app.get('/statement/date', verifyExistsAccount, (request, response) => {
  const { customer } = request;
  const {date} = request.query;

  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter(statement => 
    statement.created_at.toDateString() === 
    new Date(dateFormat).toDateString());
  
  return response.json(statement)
})

app.put('/account', verifyExistsAccount, (request, response) => {
  const {name} = request.body;
  const {customer} = request;
  customer.name = name;
  return response.status(201).json({message: 'Update successfully'})
});

app.get('/account', verifyExistsAccount, (request, response) => {
  const {customer} = request;
  return response.json(customer)
})

app.delete('/account', verifyExistsAccount, (request, response) =>{
  const {customer} = request;

  customers.splice(customers.indexOf(customer), 1);

  return response.status(200).json(customers)
})

app.get('/balance', verifyExistsAccount, (request, response) => {
  const {customer} = request;

  const balance = getBalance(customer.statement);

  const resume = {
    Wallet: balance,
    Transactions: customer.statement
  } 

  return response.status(200).json(resume);
});

app.listen(3333);