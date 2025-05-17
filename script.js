// Game state
const gameState = {
    money: 100,
    reputation: 50,
    sobriety: 100,
    barLevel: 1,
    hasBartender: false,
    customers: [],
    intoxicationLevel: 0,
    drinksServed: 0
};

// DOM elements
const moneyEl = document.getElementById('money');
const reputationEl = document.getElementById('reputation');
const sobrietyEl = document.getElementById('sobriety');
const customersEl = document.getElementById('customers');
const playerEl = document.getElementById('player');
const messageLogEl = document.getElementById('message-log');

// Buttons
const serveBeerBtn = document.getElementById('serve-beer');
const serveCocktailBtn = document.getElementById('serve-cocktail');
const serveShotBtn = document.getElementById('serve-shot');
const drinkSelfBtn = document.getElementById('drink-self');
const upgradeBarBtn = document.getElementById('upgrade-bar');
const hireBartenderBtn = document.getElementById('hire-bartender');

// Drink prices and effects
const drinks = {
    beer: {
        price: 5,
        reputation: 1,
        time: 3000
    },
    cocktail: {
        price: 10,
        reputation: 2,
        time: 5000
    },
    shot: {
        price: 7,
        reputation: 1.5,
        time: 2000
    }
};

// Game functions
function updateUI() {
    moneyEl.textContent = gameState.money;
    reputationEl.textContent = gameState.reputation;
    sobrietyEl.textContent = gameState.sobriety;
    
    // Update button states
    upgradeBarBtn.disabled = gameState.money < 200;
    hireBartenderBtn.disabled = gameState.money < 300 || gameState.hasBartender;
    
    // Update intoxication effects
    playerEl.className = 'player';
    if (gameState.intoxicationLevel > 0) {
        playerEl.classList.add(`drunk-${Math.min(gameState.intoxicationLevel, 5)}`);
    }
}

function addMessage(message) {
    const messageEl = document.createElement('div');
    messageEl.className = 'message';
    messageEl.textContent = message;
    messageLogEl.appendChild(messageEl);
    messageLogEl.scrollTop = messageLogEl.scrollHeight;
}

function spawnCustomer() {
    if (gameState.customers.length >= 3 + gameState.barLevel) return;
    
    const customerId = Date.now();
    const customerEl = document.createElement('div');
    customerEl.className = 'customer';
    customerEl.id = `customer-${customerId}`;
    customerEl.style.left = `${30 + Math.random() * 60}%`;
    customersEl.appendChild(customerEl);
    
    const customer = {
        id: customerId,
        element: customerEl,
        patience: 100,
        served: false
    };
    
    gameState.customers.push(customer);
    
    // Customer leaves if not served
    const patienceInterval = setInterval(() => {
        customer.patience -= 5;
        if (customer.patience <= 0) {
            clearInterval(patienceInterval);
            if (!customer.served) {
                removeCustomer(customerId, false);
                gameState.reputation = Math.max(0, gameState.reputation - 5);
                addMessage('A customer left unhappy! -5 Reputation');
                updateUI();
            }
        }
    }, 1000);
}

function removeCustomer(customerId, served) {
    const customerIndex = gameState.customers.findIndex(c => c.id === customerId);
    if (customerIndex === -1) return;
    
    const customer = gameState.customers[customerIndex];
    if (customer.timeout) clearTimeout(customer.timeout);
    
    // Remove element with animation
    customer.element.style.transition = 'all 0.5s';
    customer.element.style.opacity = '0';
    customer.element.style.transform = 'translateY(50px)';
    
    setTimeout(() => {
        customer.element.remove();
        gameState.customers.splice(customerIndex, 1);
    }, 500);
    
    if (served) {
        gameState.drinksServed++;
        if (gameState.drinksServed % 10 === 0) {
            gameState.reputation = Math.min(100, gameState.reputation + 10);
            addMessage('Customers are loving your bar! +10 Reputation');
        }
    }
}

function serveDrink(type) {
    if (gameState.customers.length === 0) {
        addMessage('No customers to serve!');
        return;
    }
    
    // Find first unserved customer
    const customer = gameState.customers.find(c => !c.served);
    if (!customer) {
        addMessage('All customers are already served!');
        return;
    }
    
    customer.served = true;
    const drink = drinks[type];
    
    // Show drink indicator
    const drinkIndicator = customer.element.querySelector('.drink-indicator') || document.createElement('div');
    drinkIndicator.className = 'drink-indicator';
    drinkIndicator.style.display = 'block';
    customer.element.appendChild(drinkIndicator);
    
    // Earn money after serving time
    customer.timeout = setTimeout(() => {
        gameState.money += drink.price;
        gameState.reputation = Math.min(100, gameState.reputation + drink.reputation);
        addMessage(`Served ${type} for $${drink.price}!`);
        removeCustomer(customer.id, true);
        updateUI();
    }, drink.time);
    
    updateUI();
}

function drinkYourself() {
    gameState.sobriety = Math.max(0, gameState.sobriety - 5);
    gameState.intoxicationLevel = Math.floor((100 - gameState.sobriety) / 20) + 1;
    
    // Show drink indicator
    const drinkIndicator = playerEl.querySelector('.drink-indicator');
    drinkIndicator.style.display = 'block';
    
    setTimeout(() => {
        drinkIndicator.style.display = 'none';
        
        if (gameState.sobriety <= 0) {
            addMessage('You blacked out! The bar is closed for the night.');
            gameState.money -= 50;
            gameState.reputation = Math.max(0, gameState.reputation - 10);
            gameState.sobriety = 50;
            gameState.intoxicationLevel = 0;
            
            // Remove all customers
            gameState.customers.forEach(c => {
                if (c.timeout) clearTimeout(c.timeout);
                c.element.remove();
            });
            gameState.customers = [];
        } else if (gameState.sobriety < 30) {
            addMessage('You\'re getting very drunk... maybe slow down?');
        } else if (gameState.sobriety < 60) {
            addMessage('You\'re feeling buzzed...');
        }
        
        updateUI();
    }, 1000);
    
    updateUI();
}

function upgradeBar() {
    if (gameState.money < 200) return;
    
    gameState.money -= 200;
    gameState.barLevel++;
    addMessage(`Bar upgraded to level ${gameState.barLevel}! Can serve more customers.`);
    updateUI();
}

function hireBartender() {
    if (gameState.money < 300 || gameState.hasBartender) return;
    
    gameState.money -= 300;
    gameState.hasBartender = true;
    addMessage('Bartender hired! They\'ll automatically serve some customers.');
    updateUI();
    
    // Bartender auto-serves occasionally
    setInterval(() => {
        if (gameState.hasBartender && Math.random() > 0.7 && gameState.customers.some(c => !c.served)) {
            const drinkTypes = Object.keys(drinks);
            const randomType = drinkTypes[Math.floor(Math.random() * drinkTypes.length)];
            serveDrink(randomType);
            addMessage(`Bartender served a ${randomType}!`);
        }
    }, 5000);
}

// Event listeners
serveBeerBtn.addEventListener('click', () => serveDrink('beer'));
serveCocktailBtn.addEventListener('click', () => serveDrink('cocktail'));
serveShotBtn.addEventListener('click', () => serveDrink('shot'));
drinkSelfBtn.addEventListener('click', drinkYourself);
upgradeBarBtn.addEventListener('click', upgradeBar);
hireBartenderBtn.addEventListener('click', hireBartender);

// Game loop
setInterval(spawnCustomer, 3000);

// Initialize
updateUI();
addMessage('Welcome to Bar Tycoon Simulator! Serve drinks to earn money.');
