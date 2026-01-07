// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeData();
    
    // Mobile optimizations
    if ('ontouchstart' in window) {
        document.body.classList.add('touch-device');
    }
    
    // Prevent double-tap zoom on mobile
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // Handle viewport height changes on mobile (keyboard, etc.)
    function handleViewportChange() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    handleViewportChange();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);
});

// Data storage
let guildMembers = [];
let lootItems = [];
let rotationHistory = [];
let lootRotations = {}; // Stores rotation order per loot item
let rotationsToday = 0;

// Loot system state
let playerSkipCounts = {}; // Track skips per player per rotation
let skippedItems = []; // Global skipped items queue
let highlightedItems = new Set(); // Track highlighted swapped items
let currentLootState = {}; // Track item states: pending, looted, skipped, swapped
let currentPlayerRotation = {}; // Track current player for each loot item

// Queue system state
let rotationQueue = []; // Queue for new items to be added to rotation

// Admin authentication
const ADMIN_PASSWORD = 'nerie12345!';
let isAdmin = false;

// Initialize with sample data
function initializeData() {
    // Guild members from the spreadsheet
    const memberNames = [
        "Marco", "Cart", "Khin", "Nok", "Miles", "Sny", "Econg", "Pennis", 
        "Badboy", "Akiro", "Touch", "Cap", "Conrad", "Thalium", "Guess", 
        "Rex", "Blake", "Doz", "DeathHunter", "Kamotemaru", "DK", "Trez", 
        "3 man arrow", "Claire"
    ];
    
    guildMembers = memberNames.map((name, index) => ({
        id: index + 1,
        name: name,
        class: "member",
        joinDate: new Date().toISOString()
    }));

    // The 5 loot items from the spreadsheet
    lootItems = [
        { id: 1, name: "CoC", rarity: "legendary", type: "Loot", addedDate: new Date().toISOString() },
        { id: 2, name: "Feather", rarity: "epic", type: "Loot", addedDate: new Date().toISOString() },
        { id: 3, name: "Flame", rarity: "epic", type: "Loot", addedDate: new Date().toISOString() },
        { id: 4, name: "AA", rarity: "rare", type: "Loot", addedDate: new Date().toISOString() },
        { id: 5, name: "AA (blessed)", rarity: "legendary", type: "Loot", addedDate: new Date().toISOString() }
    ];

    // Pre-defined rotation orders from the spreadsheet
    lootRotations = {
        "CoC": ["Marco", "Cart", "Khin", "Nok", "Miles", "Sny", "Econg", "Pennis", "Badboy", "Akiro", "Touch", "Cap", "Conrad", "Thalium", "Guess", "Rex", "Blake", "Doz", "DeathHunter", "Kamotemaru", "DK", "Trez", "3 man arrow", "Claire"],
        "Feather": ["Trez", "DK", "Kamotemaru", "DeathHunter", "Doz", "Blake", "Guess", "Rex", "Econg", "Conrad", "Akiro", "Touch", "Cap", "Akiro", "Badboy", "Thalium", "Pennis", "Miles", "Nok", "Khin", "Cart", "Marco", "Claire", "3man arrow"],
        "Flame": ["Conrad", "Nok", "DeathHunter", "Kamotemaru", "Econg", "Guess", "Khin", "Doz", "Badboy", "Miles", "Touch", "Sny", "Marco", "Cap", "Blake", "Trez", "Cart", "Thalium", "Rex", "Pennis", "Akiro", "DK", "3 man arrow", "Claire"],
        "AA": ["3 man arrow", "Guess", "Claire", "Cap", "Trez", "DeathHunter", "Miles", "Cart", "Badboy", "Sny", "Marco", "Pennis", "Nok", "Econg", "Blake", "Khin", "Kamotemaru", "Akiro", "Touch", "DK", "Conrad", "Doz", "Rex", "Thalium"],
        "AA (blessed)": []
    };

    // Load saved data from localStorage if available
    loadData();
    initializeLootSystem();
    updateStats();
    renderRotation();
    renderMembers();
    renderLoot();
    renderHistory();
    renderQueue();
    updateQueueStats();
}

// Initialize loot system
function initializeLootSystem() {
    // Initialize current player for each loot item
    lootItems.forEach(loot => {
        if (!currentPlayerRotation[loot.name]) {
            currentPlayerRotation[loot.name] = 0;
        }
        if (!currentLootState[loot.name]) {
            currentLootState[loot.name] = 'pending';
        }
    });
    
    // Initialize skip counts for all members
    guildMembers.forEach(member => {
        if (!playerSkipCounts[member.name]) {
            playerSkipCounts[member.name] = 0;
        }
    });
}

// Tab management
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.remove('hidden');
    
    // Update button styles
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-purple-600');
        btn.classList.add('bg-gray-700');
    });
    
    event.target.classList.remove('bg-gray-700');
    event.target.classList.add('bg-purple-600');
}

// Current position tracker for each loot
let currentPositions = {};

// Rotation system - advances each loot to the next person
function nextRotation() {
    lootItems.forEach(loot => {
        const rotation = lootRotations[loot.name];
        if (rotation && rotation.length > 0) {
            currentPositions[loot.name] = ((currentPositions[loot.name] || 0) + 1) % rotation.length;
        }
    });

    // Log to history
    const historyEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        assignments: lootItems.map(loot => ({
            loot: loot.name,
            member: lootRotations[loot.name]?.[currentPositions[loot.name]] || 'N/A'
        }))
    };
    rotationHistory.unshift(historyEntry);
    rotationsToday++;

    saveData();
    renderRotation();
    renderHistory();
    updateStats();
    
    showNotification('Advanced to next rotation!', 'success');
}

// Loot Action Modal Functions
function showLootActionModal(lootName) {
    if (!isAdmin) {
        showNotification('Admin access required to perform loot actions!', 'error');
        return;
    }
    
    const currentMember = lootRotations[lootName]?.[currentPlayerRotation[lootName]] || 'N/A';
    const loot = lootItems.find(l => l.name === lootName);
    const skipCount = playerSkipCounts[currentMember] || 0;
    const skipsLeft = Math.max(0, 2 - skipCount);
    
    document.getElementById('current-loot-name').textContent = lootName;
    document.getElementById('current-loot-type').textContent = loot?.type || 'Loot';
    document.getElementById('current-player-name').textContent = currentMember;
    document.getElementById('skip-count').textContent = `Skips left: ${skipsLeft}/2`;
    
    // Show skipped items if any
    if (skippedItems.length > 0) {
        document.getElementById('skipped-items-section').style.display = 'block';
        document.getElementById('skipped-items-list').innerHTML = skippedItems.map(item => `
            <div class="bg-neutral-800 rounded p-2 text-xs">
                ${item.lootName} - ${item.playerName}
            </div>
        `).join('');
    } else {
        document.getElementById('skipped-items-section').style.display = 'none';
    }
    
    // Disable skip button if no skips left
    const skipBtn = document.getElementById('skip-btn');
    if (skipsLeft === 0) {
        skipBtn.disabled = true;
        skipBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        skipBtn.disabled = false;
        skipBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    
    // Store current loot context
    window.currentLootContext = { lootName, currentMember };
    
    document.getElementById('loot-action-modal').classList.remove('hidden');
}

function hideLootActionModal() {
    document.getElementById('loot-action-modal').classList.add('hidden');
    window.currentLootContext = null;
}

function hideSwapModal() {
    document.getElementById('swap-modal').classList.add('hidden');
    window.currentSwapContext = null;
}

// Core Loot Action Handler
function lootAction(action) {
    const context = window.currentLootContext;
    if (!context) return;
    
    const { lootName, currentMember } = context;
    
    switch(action) {
        case 'loot':
            handleLoot(lootName, currentMember);
            break;
        case 'skip':
            handleSkip(lootName, currentMember);
            break;
        case 'swap':
            handleSwap(lootName, currentMember);
            break;
    }
    
    hideLootActionModal();
}

function handleLoot(lootName, playerName) {
    // Clear existing highlights
    highlightedItems.clear();
    
    // Mark item as looted
    currentLootState[lootName] = 'looted';
    
    // Clear any skip state for this player
    playerSkipCounts[playerName] = 0;
    
    // Log to history
    const historyEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: 'loot',
        loot: lootName,
        member: playerName,
        action: 'looted'
    };
    rotationHistory.unshift(historyEntry);
    rotationsToday++;
    
    // Move to next item or handle skipped items
    moveToNextItem();
    
    // Highlight the next item for the same loot
    const rotation = lootRotations[lootName];
    if (rotation && rotation.length > 0) {
        highlightedItems.add(lootName);
    }
    
    saveData();
    renderRotation();
    renderHistory();
    updateStats();
    
    showNotification(`${playerName} looted ${lootName}!`, 'success');
}

function handleSkip(lootName, playerName) {
    const skipCount = playerSkipCounts[playerName] || 0;
    
    if (skipCount >= 2) {
        showNotification('No skips left! You must loot or swap.', 'error');
        return;
    }
    
    // Add to skipped items
    skippedItems.push({
        lootName,
        playerName,
        timestamp: Date.now()
    });
    
    // Increment skip count
    playerSkipCounts[playerName] = skipCount + 1;
    currentLootState[lootName] = 'skipped';
    
    // If this is the second skip, remove player from all rotations
    if (skipCount + 1 >= 2) {
        Object.keys(lootRotations).forEach(loot => {
            const rotation = lootRotations[loot];
            const playerIndex = rotation.indexOf(playerName);
            if (playerIndex !== -1) {
                // Mark as removed but keep position for restoration later
                if (!rotation.removedPlayers) {
                    rotation.removedPlayers = [];
                }
                rotation.removedPlayers.push({
                    name: playerName,
                    originalIndex: playerIndex
                });
                rotation.splice(playerIndex, 1);
                
                // Adjust current rotation index if needed
                if (currentPlayerRotation[loot] > playerIndex) {
                    currentPlayerRotation[loot]--;
                } else if (currentPlayerRotation[loot] >= rotation.length) {
                    currentPlayerRotation[loot] = 0;
                }
            }
        });
        
        showNotification(`${playerName} has reached skip limit and removed from rotation!`, 'warning');
    }
    
    // Log to history
    const historyEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: 'skip',
        loot: lootName,
        member: playerName,
        action: 'skipped'
    };
    rotationHistory.unshift(historyEntry);
    
    // Move to next item
    moveToNextItem();
    
    saveData();
    renderRotation();
    renderHistory();
    
    if (skipCount + 1 < 2) {
        showNotification(`${playerName} skipped ${lootName} (${skipCount + 1}/2 skips used)`, 'info');
    }
}

function handleSwap(lootName, playerName) {
    // Show swap modal with member selection
    showSwapModal(lootName, playerName);
}

function showSwapModal(lootName, currentPlayer) {
    const loot = lootItems.find(l => l.name === lootName);
    
    document.getElementById('swap-new-item').textContent = lootName;
    
    // Show other members to swap with
    const otherMembers = guildMembers.filter(m => m.name !== currentPlayer);
    document.getElementById('equipped-items-list').innerHTML = otherMembers.map(member => `
        <div class="bg-neutral-800 rounded p-3 border border-neutral-700 hover:border-blue-600 transition cursor-pointer" onclick="executeSwap('${lootName}', '${currentPlayer}', '${member.name}')">
            <div class="flex items-center justify-between">
                <div>
                    <p class="font-bold text-white text-sm">${member.name}</p>
                    <p class="text-xs text-gray-500 capitalize">${member.class}</p>
                </div>
                <i class="fas fa-exchange-alt text-blue-400"></i>
            </div>
        </div>
    `).join('');
    
    window.currentSwapContext = { lootName, currentPlayer };
    document.getElementById('swap-modal').classList.remove('hidden');
}

function executeSwap(lootName, currentPlayer, targetPlayer) {
    // Remove any existing highlight
    highlightedItems.clear();
    
    // Mark the swapped-out item as highlighted
    highlightedItems.add(lootName);
    currentLootState[lootName] = 'swapped';
    
    // Clear skip count for current player (swap counts as loot)
    playerSkipCounts[currentPlayer] = 0;
    
    // Log to history
    const historyEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: 'swap',
        loot: lootName,
        member: currentPlayer,
        targetMember: targetPlayer,
        action: 'swapped'
    };
    rotationHistory.unshift(historyEntry);
    rotationsToday++;
    
    hideSwapModal();
    
    // Move to next item
    moveToNextItem();
    
    saveData();
    renderRotation();
    renderHistory();
    updateStats();
    
    showNotification(`${currentPlayer} swapped ${lootName} with ${targetPlayer}!`, 'success');
}

function moveToNextItem() {
    // Check if there are skipped items to revisit first
    if (skippedItems.length > 0) {
        const nextSkipped = skippedItems.shift();
        // Set the skipped item as current
        const rotation = lootRotations[nextSkipped.lootName];
        if (rotation) {
            const playerIndex = rotation.indexOf(nextSkipped.playerName);
            if (playerIndex !== -1) {
                currentPlayerRotation[nextSkipped.lootName] = playerIndex;
                currentLootState[nextSkipped.lootName] = 'pending';
            }
        }
    } else {
        // Move to next item in rotation for all items (regardless of state)
        lootItems.forEach(loot => {
            const rotation = lootRotations[loot.name];
            if (rotation && rotation.length > 0) {
                // Always advance to next player
                currentPlayerRotation[loot.name] = (currentPlayerRotation[loot.name] + 1) % rotation.length;
                // Reset state to pending for the new player
                currentLootState[loot.name] = 'pending';
            }
        });
    }
}

function resetRotation() {
    currentPositions = {};
    currentPlayerRotation = {};
    currentLootState = {};
    playerSkipCounts = {};
    skippedItems = [];
    highlightedItems.clear();
    rotationsToday = 0;
    
    // Restore removed players to rotations
    Object.keys(lootRotations).forEach(loot => {
        const rotation = lootRotations[loot];
        if (rotation.removedPlayers && rotation.removedPlayers.length > 0) {
            // Add back all removed players at their original positions
            rotation.removedPlayers.forEach(removed => {
                if (!rotation.includes(removed.name)) {
                    rotation.splice(removed.originalIndex, 0, removed.name);
                }
            });
            // Clear removed players list
            rotation.removedPlayers = [];
        }
    });
    
    // Re-initialize
    initializeLootSystem();
    
    saveData();
    renderRotation();
    updateStats();
    showNotification('Rotation reset and all players restored!', 'info');
}

function renderRotation() {
    const container = document.getElementById('rotation-display');
    
    // Initialize positions if needed
    lootItems.forEach(loot => {
        if (currentPositions[loot.name] === undefined) {
            currentPositions[loot.name] = 0;
        }
        if (!currentPlayerRotation[loot.name]) {
            currentPlayerRotation[loot.name] = 0;
        }
        if (!currentLootState[loot.name]) {
            currentLootState[loot.name] = 'pending';
        }
    });

    container.innerHTML = `
        <!-- Current Turn Summary - TOP -->
        <div class="col-span-full mb-6 bg-neutral-800 rounded-lg p-3 sm:p-4 border border-red-900/50">
            <h3 class="text-base sm:text-lg font-bold text-white mb-3"><i class="fas fa-star mr-2 text-red-500"></i>Current Turn</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                ${lootItems.map(loot => {
                    const currentMember = lootRotations[loot.name]?.[currentPlayerRotation[loot.name]] || 'N/A';
                    const isHighlighted = highlightedItems.has(loot.name);
                    const itemStatus = currentLootState[loot.name];
                    const skipCount = playerSkipCounts[currentMember] || 0;
                    const skipsLeft = Math.max(0, 2 - skipCount);
                    
                    return `
                        <div class="bg-neutral-900 rounded-lg p-3 text-center border border-neutral-700">
                            <p class="text-xs text-gray-500 mb-1">${loot.name}</p>
                            <p class="font-bold text-white text-sm sm:text-base break-words">${currentMember}</p>
                            <p class="text-xs text-gray-500 mb-2">Status: ${itemStatus}</p>
                            ${itemStatus === 'pending' && isAdmin ? `
                                <div class="space-y-2">
                                    <button onclick="showLootActionModal('${loot.name}')" class="px-3 py-2 bg-red-700 text-white text-xs rounded hover:bg-red-800 transition w-full min-h-[44px]">
                                        <i class="fas fa-treasure-chest mr-1"></i>Loot
                                    </button>
                                    <p class="text-xs text-gray-400">Skips: ${skipsLeft}/2</p>
                                </div>
                            ` : ''}
                            ${!isAdmin && itemStatus === 'pending' ? `
                                <div class="space-y-2">
                                    <p class="text-xs text-gray-500 italic">Admin required for loot actions</p>
                                    <p class="text-xs text-gray-400">Skips: ${skipsLeft}/2</p>
                                </div>
                            ` : ''}
                            ${itemStatus === 'skipped' ? '<p class="text-xs text-yellow-500 mt-1"><i class="fas fa-forward mr-1"></i>Skipped</p>' : ''}
                            ${itemStatus === 'swapped' ? '<p class="text-xs text-yellow-500 mt-1"><i class="fas fa-exchange-alt mr-1"></i>Swapped</p>' : ''}
                            ${itemStatus === 'looted' ? '<p class="text-xs text-green-500 mt-1"><i class="fas fa-check mr-1"></i>Looted</p>' : ''}
                            ${isAdmin ? `
                                <button onclick="deleteLootItem('${loot.name}')" class="mt-2 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition w-full" title="Delete item">
                                    <i class="fas fa-trash mr-1"></i>Delete
                                </button>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
            ${skippedItems.length > 0 ? `
                <div class="mt-4 p-3 bg-yellow-900/20 rounded-lg border border-yellow-700/50">
                    <p class="text-sm text-yellow-500 mb-2"><i class="fas fa-forward mr-2"></i>Skipped Items Queue:</p>
                    <div class="flex flex-wrap gap-2">
                        ${skippedItems.map((item, index) => `
                            <span class="px-2 py-1 bg-yellow-800 text-yellow-200 rounded text-xs">
                                ${item.lootName} (${item.playerName})
                            </span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>

        <div class="col-span-full overflow-x-auto">
            <table class="w-full border-collapse">
                <thead>
                    <tr>
                        <th class="text-left p-3 bg-neutral-800 text-gray-400 font-bold border-b border-neutral-700">#</th>
                        ${lootItems.map(loot => `
                            <th class="text-center p-3 bg-neutral-800 border-b border-neutral-700">
                                <span class="text-white font-bold">${loot.name}</span>
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${generateRotationRows()}
                </tbody>
            </table>
        </div>
    `;
}

// Advance a single loot item to the next person
function advanceLoot(lootName) {
    if (!isAdmin) {
        showNotification('Admin access required!', 'error');
        return;
    }
    
    const rotation = lootRotations[lootName];
    if (!rotation || rotation.length === 0) {
        showNotification(`No rotation set for ${lootName}`, 'error');
        return;
    }
    
    const currentMember = rotation[currentPositions[lootName]];
    currentPositions[lootName] = (currentPositions[lootName] + 1) % rotation.length;
    const nextMember = rotation[currentPositions[lootName]];
    
    // Log to history
    const historyEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: 'single',
        loot: lootName,
        member: currentMember,
        nextMember: nextMember
    };
    rotationHistory.unshift(historyEntry);
    rotationsToday++;
    
    saveData();
    renderRotation();
    renderHistory();
    updateStats();
    
    showNotification(`${lootName} looted by ${currentMember}! Next: ${nextMember}`, 'success');
}

function generateRotationRows() {
    const maxRows = Math.max(...lootItems.map(loot => lootRotations[loot.name]?.length || 0));
    let rows = '';
    
    for (let i = 0; i < maxRows; i++) {
        rows += `
            <tr class="${i % 2 === 0 ? 'bg-neutral-900' : 'bg-neutral-950'}">
                <td class="p-3 text-gray-500 border-b border-neutral-800 text-center">${i + 1}</td>
                ${lootItems.map(loot => {
                    const rotation = lootRotations[loot.name] || [];
                    const member = rotation[i] || '';
                    const isCurrent = currentPlayerRotation[loot.name] === i;
                    const isHighlighted = highlightedItems.has(loot.name) && isCurrent;
                    
                    return `
                        <td class="p-4 border-b border-neutral-800 text-center ${isHighlighted ? 'bg-yellow-900/40 border-yellow-600' : isCurrent ? 'bg-red-900/30 font-bold text-white' : 'text-gray-400'} relative min-h-[60px]">
                            ${isCurrent ? '<i class="fas fa-arrow-right mr-2 text-red-500"></i>' : ''}
                            ${isHighlighted ? '<i class="fas fa-star mr-1 text-yellow-500"></i>' : ''}
                            <span class="${isCurrent ? 'font-bold' : ''}">${member}</span>
                            ${isAdmin && member ? `
                                <div class="absolute top-1 right-1 flex space-x-1 opacity-60 hover:opacity-100 transition-opacity bg-neutral-800/90 rounded p-1 shadow-lg">
                                    <button onclick="moveMemberInTable('${loot.name}', ${i}, 'up')" class="p-1 text-blue-500 hover:bg-blue-900/50 rounded text-xs" ${i === 0 ? 'disabled style="opacity:0.3 cursor:not-allowed"' : ''} title="Move up">
                                        <i class="fas fa-arrow-up"></i>
                                    </button>
                                    <button onclick="moveMemberInTable('${loot.name}', ${i}, 'down')" class="p-1 text-blue-500 hover:bg-blue-900/50 rounded text-xs" ${i === rotation.length - 1 ? 'disabled style="opacity:0.3 cursor:not-allowed"' : ''} title="Move down">
                                        <i class="fas fa-arrow-down"></i>
                                    </button>
                                </div>
                            ` : ''}
                        </td>
                    `;
                }).join('')}
            </tr>
        `;
    }
    return rows;
}

// Admin table arrangement functions
function moveMemberInTable(lootName, index, direction) {
    if (!isAdmin) {
        showNotification('Admin access required!', 'error');
        return;
    }
    
    const rotation = lootRotations[lootName];
    if (!rotation || rotation.length <= index) return;
    
    if (direction === 'up' && index > 0) {
        // Swap with previous member
        [rotation[index], rotation[index - 1]] = [rotation[index - 1], rotation[index]];
        // Adjust current rotation index if needed
        if (currentPlayerRotation[lootName] === index) {
            currentPlayerRotation[lootName] = index - 1;
        } else if (currentPlayerRotation[lootName] === index - 1) {
            currentPlayerRotation[lootName] = index;
        }
    } else if (direction === 'down' && index < rotation.length - 1) {
        // Swap with next member
        [rotation[index], rotation[index + 1]] = [rotation[index + 1], rotation[index]];
        // Adjust current rotation index if needed
        if (currentPlayerRotation[lootName] === index) {
            currentPlayerRotation[lootName] = index + 1;
        } else if (currentPlayerRotation[lootName] === index + 1) {
            currentPlayerRotation[lootName] = index;
        }
    }
    
    saveData();
    renderRotation();
    showNotification('Member moved in rotation!', 'success');
}

// Member management
function showAddMemberModal() {
    document.getElementById('add-member-modal').classList.remove('hidden');
}

function hideAddMemberModal() {
    document.getElementById('add-member-modal').classList.add('hidden');
    document.getElementById('member-name').value = '';
    document.getElementById('member-class').value = '';
}

function addMember() {
    const name = document.getElementById('member-name').value.trim();
    const memberClass = document.getElementById('member-class').value;
    
    if (!name || !memberClass) {
        showNotification('Please fill all fields!', 'error');
        return;
    }

    const newMember = {
        id: Date.now(),
        name: name,
        class: memberClass,
        joinDate: new Date().toISOString()
    };

    guildMembers.push(newMember);
    saveData();
    renderMembers();
    updateStats();
    hideAddMemberModal();
    showNotification(`${name} joined the guild!`, 'success');
}

function removeMember(memberId) {
    guildMembers = guildMembers.filter(m => m.id !== memberId);
    saveData();
    renderMembers();
    updateStats();
    showNotification('Member removed from guild', 'info');
}

function renderMembers() {
    const container = document.getElementById('members-list');
    
    if (guildMembers.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-500">
                <i class="fas fa-users text-4xl mb-4 opacity-30"></i>
                <p>No guild members yet. Add your first member!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = guildMembers.map(member => `
        <div class="bg-neutral-800 rounded-lg p-3 sm:p-4 border border-neutral-700 hover:border-red-900 transition">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center space-x-3 flex-1 min-w-0">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 bg-neutral-700 rounded-full flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-user text-white text-sm sm:text-base"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="font-bold text-white text-sm sm:text-base truncate">${member.name}</h3>
                        <p class="text-xs sm:text-sm text-gray-500 capitalize">${member.class}</p>
                    </div>
                </div>
                <button onclick="removeMember(${member.id})" class="text-red-500 hover:text-red-400 transition p-2 min-h-[44px]">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="text-xs text-gray-600">
                Joined ${new Date(member.joinDate).toLocaleDateString()}
            </div>
        </div>
    `).join('');
}

// Loot management
function showAddLootModal() {
    document.getElementById('add-loot-modal').classList.remove('hidden');
}

function hideAddLootModal() {
    document.getElementById('add-loot-modal').classList.add('hidden');
    document.getElementById('loot-name').value = '';
    document.getElementById('loot-rarity').value = '';
    document.getElementById('loot-type').value = '';
}

function addLoot() {
    const name = document.getElementById('loot-name').value.trim();
    const rarity = document.getElementById('loot-rarity').value;
    const type = document.getElementById('loot-type').value.trim();
    
    if (!name || !rarity || !type) {
        showNotification('Please fill all fields!', 'error');
        return;
    }

    const newLoot = {
        id: Date.now(),
        name: name,
        rarity: rarity,
        type: type,
        addedDate: new Date().toISOString()
    };

    lootItems.push(newLoot);
    saveData();
    renderLoot();
    updateStats();
    hideAddLootModal();
    showNotification(`${name} added to loot pool!`, 'success');
}

function removeLoot(lootId) {
    lootItems = lootItems.filter(l => l.id !== lootId);
    saveData();
    renderLoot();
    updateStats();
    showNotification('Loot item removed', 'info');
}

function renderLoot() {
    const container = document.getElementById('loot-list');
    
    if (lootItems.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-500">
                <i class="fas fa-treasure-chest text-4xl mb-4 opacity-30"></i>
                <p>No loot items yet. Add your first item!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = lootItems.map(loot => `
        <div class="bg-neutral-800 rounded-lg p-3 sm:p-4 border border-neutral-700 hover:border-red-900 transition">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center space-x-2 flex-1 min-w-0">
                    <i class="fas fa-treasure-chest text-white flex-shrink-0"></i>
                    <div class="flex-1 min-w-0">
                        <h3 class="font-bold text-white text-sm sm:text-base truncate">${loot.name}</h3>
                        <p class="text-xs text-gray-500">${loot.type}</p>
                    </div>
                </div>
                ${isAdmin ? `
                    <button onclick="deleteLootItem('${loot.name}')" class="text-red-500 hover:text-red-400 transition p-2 min-h-[44px]" title="Delete item">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
            <div class="flex items-center justify-between">
                <span class="text-xs px-2 py-1 bg-neutral-700 text-gray-300 rounded capitalize">
                    ${loot.rarity}
                </span>
                <span class="text-xs text-gray-600">
                    Added ${new Date(loot.addedDate).toLocaleDateString()}
                </span>
            </div>
        </div>
    `).join('');
}

// Helper function to format time ago
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';
    
    return 'Just now';
}

// History
function renderHistory() {
    const container = document.getElementById('history-list');
    
    if (rotationHistory.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-history text-4xl mb-4 opacity-30"></i>
                <p>No loot history yet</p>
            </div>
        `;
        return;
    }

    container.innerHTML = rotationHistory.slice(0, 20).map(entry => {
        const date = new Date(entry.timestamp);
        const timeAgo = getTimeAgo(date);
        
        if (entry.type === 'loot') {
            // Loot entry
            return `
                <div class="bg-neutral-800 rounded-lg p-4 border border-neutral-700 flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <div class="w-10 h-10 bg-green-700 rounded-full flex items-center justify-center">
                            <i class="fas fa-treasure-chest text-white"></i>
                        </div>
                        <div>
                            <p class="font-bold text-white">
                                <span class="text-white">${entry.member}</span> 
                                <span class="text-green-500">looted</span> 
                                <span class="text-red-400">${entry.loot}</span>
                            </p>
                            <p class="text-xs text-gray-500">${timeAgo}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-gray-500">${date.toLocaleDateString()}</p>
                        <p class="text-xs text-gray-600">${date.toLocaleTimeString()}</p>
                    </div>
                </div>
            `;
        } else if (entry.type === 'skip') {
            // Skip entry
            return `
                <div class="bg-neutral-800 rounded-lg p-4 border border-neutral-700 flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <div class="w-10 h-10 bg-yellow-700 rounded-full flex items-center justify-center">
                            <i class="fas fa-forward text-white"></i>
                        </div>
                        <div>
                            <p class="font-bold text-white">
                                <span class="text-white">${entry.member}</span> 
                                <span class="text-yellow-500">skipped</span> 
                                <span class="text-red-400">${entry.loot}</span>
                            </p>
                            <p class="text-xs text-gray-500">${timeAgo}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-gray-500">${date.toLocaleDateString()}</p>
                        <p class="text-xs text-gray-600">${date.toLocaleTimeString()}</p>
                    </div>
                </div>
            `;
        } else if (entry.type === 'swap') {
            // Swap entry
            return `
                <div class="bg-neutral-800 rounded-lg p-4 border border-neutral-700 flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <div class="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center">
                            <i class="fas fa-exchange-alt text-white"></i>
                        </div>
                        <div>
                            <p class="font-bold text-white">
                                <span class="text-white">${entry.member}</span> 
                                <span class="text-blue-500">swapped</span> 
                                <span class="text-red-400">${entry.loot}</span>
                                ${entry.targetMember ? ` <span class="text-gray-500">with</span> <span class="text-white">${entry.targetMember}</span>` : ''}
                            </p>
                            <p class="text-xs text-gray-500">${timeAgo}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-gray-500">${date.toLocaleDateString()}</p>
                        <p class="text-xs text-gray-600">${date.toLocaleTimeString()}</p>
                    </div>
                </div>
            `;
        } else if (entry.type === 'single') {
            // Legacy single loot entry
            return `
                <div class="bg-neutral-800 rounded-lg p-4 border border-neutral-700 flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <div class="w-10 h-10 bg-red-700 rounded-full flex items-center justify-center">
                            <i class="fas fa-check text-white"></i>
                        </div>
                        <div>
                            <p class="font-bold text-white">
                                <span class="text-white">${entry.member}</span> 
                                <span class="text-gray-500">looted</span> 
                                <span class="text-red-400">${entry.loot}</span>
                            </p>
                            <p class="text-xs text-gray-500">Next: ${entry.nextMember} • ${timeAgo}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-gray-500">${date.toLocaleDateString()}</p>
                        <p class="text-xs text-gray-600">${date.toLocaleTimeString()}</p>
                    </div>
                </div>
            `;
        } else {
            // Legacy multi-assignment entry
            return `
                <div class="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="font-bold text-white">
                            <i class="fas fa-clock mr-2 text-gray-500"></i>
                            ${date.toLocaleString()}
                        </h3>
                        <span class="text-sm text-gray-500">${entry.assignments?.length || 0} assignments</span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        ${(entry.assignments || []).map(assignment => `
                            <div class="bg-neutral-900 rounded p-2 text-sm">
                                <span class="text-white">${assignment.member?.name || assignment.member}</span> 
                                <i class="fas fa-arrow-right mx-2 text-gray-600"></i> 
                                <span class="text-red-400">${assignment.loot?.name || assignment.loot}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }).join('');
}

// Stats
function updateStats() {
    document.getElementById('total-members').textContent = guildMembers.length;
    document.getElementById('total-loot').textContent = lootItems.length;
    document.getElementById('rotations-today').textContent = rotationsToday;
}

// Utility functions
function getRarityColor(rarity) {
    const colors = {
        common: 'gray-400',
        uncommon: 'green-400',
        rare: 'blue-400',
        epic: 'purple-400',
        legendary: 'orange-400'
    };
    return colors[rarity] || 'gray-400';
}

function getRarityBgColor(rarity) {
    const colors = {
        common: 'gray-800',
        uncommon: 'green-800',
        rare: 'blue-800',
        epic: 'purple-800',
        legendary: 'orange-800'
    };
    return colors[rarity] || 'gray-800';
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-4 px-6 py-3 rounded-lg text-white font-medium z-50 fade-in border ${
        type === 'success' ? 'bg-neutral-900 border-red-700' :
        type === 'error' ? 'bg-neutral-900 border-red-500' :
        type === 'info' ? 'bg-neutral-900 border-neutral-700' : 'bg-neutral-900 border-neutral-700'
    }`;
    notification.innerHTML = `
        <div class="flex items-center space-x-2">
            <i class="fas fa-${
                type === 'success' ? 'check-circle text-red-500' :
                type === 'error' ? 'exclamation-circle text-red-500' :
                type === 'info' ? 'info-circle text-gray-400' : 'bell text-gray-400'
            }"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Data persistence
function saveData() {
    const data = {
        guildMembers,
        lootItems,
        lootRotations,
        rotationHistory,
        currentPositions,
        rotationsToday,
        // New loot system state
        playerSkipCounts,
        skippedItems,
        highlightedItems: Array.from(highlightedItems),
        currentLootState,
        currentPlayerRotation,
        // Queue system
        rotationQueue
    };
    localStorage.setItem('guildLootRotation', JSON.stringify(data));
}

function loadData() {
    const saved = localStorage.getItem('guildLootRotation');
    if (saved) {
        const data = JSON.parse(saved);
        if (data.guildMembers) guildMembers = data.guildMembers;
        if (data.lootItems) lootItems = data.lootItems;
        if (data.lootRotations) lootRotations = data.lootRotations;
        if (data.rotationHistory) rotationHistory = data.rotationHistory;
        if (data.currentPositions) currentPositions = data.currentPositions;
        if (data.rotationsToday) rotationsToday = data.rotationsToday;
        if (data.playerSkipCounts) playerSkipCounts = data.playerSkipCounts;
        if (data.skippedItems) skippedItems = data.skippedItems;
        if (data.highlightedItems) highlightedItems = new Set(data.highlightedItems);
        if (data.currentLootState) currentLootState = data.currentLootState;
        if (data.currentPlayerRotation) currentPlayerRotation = data.currentPlayerRotation;
        if (data.rotationQueue) rotationQueue = data.rotationQueue;
    }
}

// Queue Management Functions
function showAddQueueItemModal() {
    document.getElementById('add-queue-item-modal').classList.remove('hidden');
}

function hideAddQueueItemModal() {
    document.getElementById('add-queue-item-modal').classList.add('hidden');
    document.getElementById('queue-item-name').value = '';
    document.getElementById('queue-item-rarity').value = '';
    document.getElementById('queue-item-type').value = '';
    document.getElementById('queue-item-priority').value = 'normal';
}

function addQueueItem() {
    const name = document.getElementById('queue-item-name').value.trim();
    const rarity = document.getElementById('queue-item-rarity').value;
    const type = document.getElementById('queue-item-type').value.trim();
    const priority = document.getElementById('queue-item-priority').value;
    
    if (!name || !rarity || !type) {
        showNotification('Please fill all required fields!', 'error');
        return;
    }

    const queueItem = {
        id: Date.now(),
        name: name,
        rarity: rarity,
        type: type,
        priority: priority,
        addedDate: new Date().toISOString(),
        status: 'queued'
    };

    // Add to queue with priority ordering
    if (priority === 'urgent') {
        rotationQueue.unshift(queueItem);
    } else if (priority === 'high') {
        // Insert after urgent items
        const urgentCount = rotationQueue.filter(item => item.priority === 'urgent').length;
        rotationQueue.splice(urgentCount, 0, queueItem);
    } else {
        rotationQueue.push(queueItem);
    }

    saveData();
    renderQueue();
    updateQueueStats();
    hideAddQueueItemModal();
    showNotification(`${name} added to rotation queue!`, 'success');
}

function removeFromQueue(queueId) {
    rotationQueue = rotationQueue.filter(item => item.id !== queueId);
    saveData();
    renderQueue();
    updateQueueStats();
    showNotification('Item removed from queue', 'info');
}

function moveToRotation(queueId) {
    const queueItem = rotationQueue.find(item => item.id === queueId);
    if (!queueItem) return;

    // Add to loot items
    const newLoot = {
        id: queueItem.id,
        name: queueItem.name,
        rarity: queueItem.rarity,
        type: queueItem.type,
        addedDate: queueItem.addedDate
    };

    lootItems.push(newLoot);

    // Initialize rotation for new item with all members
    if (!lootRotations[queueItem.name]) {
        lootRotations[queueItem.name] = guildMembers.map(member => member.name);
    }

    // Remove from queue
    rotationQueue = rotationQueue.filter(item => item.id !== queueId);

    // Initialize loot system state for new item
    currentPlayerRotation[queueItem.name] = 0;
    currentLootState[queueItem.name] = 'pending';

    saveData();
    renderQueue();
    renderRotation();
    updateQueueStats();
    updateStats();
    showNotification(`${queueItem.name} moved to active rotation!`, 'success');
}

function renderQueue() {
    const container = document.getElementById('queue-list');
    
    if (rotationQueue.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-clock text-4xl mb-4 opacity-30"></i>
                <p>No items in queue. Add your first item!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = rotationQueue.map((item, index) => {
        const priorityColor = item.priority === 'urgent' ? 'text-red-400' : 
                             item.priority === 'high' ? 'text-yellow-400' : 'text-gray-400';
        const rarityColor = getRarityColor(item.rarity);
        
        return `
            <div class="bg-neutral-700 rounded-lg p-3 border border-neutral-600 hover:border-red-700 transition">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center space-x-3 flex-1 min-w-0">
                        <span class="text-lg font-bold ${priorityColor}">#${index + 1}</span>
                        <div class="flex-1 min-w-0">
                            <h3 class="font-bold text-white text-sm sm:text-base truncate">${item.name}</h3>
                            <p class="text-xs text-gray-400">${item.type}</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="moveToRotation(${item.id})" class="px-2 py-1 bg-green-700 text-white text-xs rounded hover:bg-green-800 transition">
                            <i class="fas fa-arrow-right mr-1"></i>Move
                        </button>
                        <button onclick="removeFromQueue(${item.id})" class="text-red-500 hover:text-red-400 transition p-1">
                            <i class="fas fa-trash text-sm"></i>
                        </button>
                    </div>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs px-2 py-1 bg-neutral-600 rounded capitalize" style="color: ${getRarityColor(item.rarity)}">
                        ${item.rarity}
                    </span>
                    <div class="flex items-center space-x-2">
                        <span class="text-xs px-2 py-1 bg-neutral-600 ${priorityColor} rounded capitalize">
                            ${item.priority}
                        </span>
                        <span class="text-xs text-gray-500">
                            Added ${new Date(item.addedDate).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateQueueStats() {
    document.getElementById('queue-count').textContent = rotationQueue.length;
    
    const nextItem = rotationQueue.length > 0 ? rotationQueue[0].name : 'None';
    document.getElementById('next-queue-item').textContent = nextItem;
}

// Randomizer Functions
function randomizeMembers() {
    if (guildMembers.length === 0) {
        showNotification('No members to randomize!', 'error');
        return;
    }
    
    // Create a shuffled copy of members
    const shuffled = [...guildMembers].sort(() => Math.random() - 0.5);
    
    // Display the result
    const resultDiv = document.getElementById('randomized-result');
    const listDiv = document.getElementById('randomized-list');
    
    listDiv.innerHTML = shuffled.map((member, index) => `
        <div class="flex items-center space-x-3 p-2 bg-neutral-700 rounded">
            <span class="text-lg font-bold text-green-400">#${index + 1}</span>
            <div class="flex-1">
                <p class="font-bold text-white">${member.name}</p>
                <p class="text-xs text-gray-400 capitalize">${member.class}</p>
            </div>
        </div>
    `).join('');
    
    // Add assign button for admin
    if (isAdmin) {
        listDiv.innerHTML += `
            <div class="mt-4 p-3 bg-neutral-800 rounded-lg border border-neutral-700">
                <p class="text-sm text-gray-400 mb-2">Assign this order to loot items:</p>
                <div class="space-y-2">
                    ${lootItems.map(loot => `
                        <button onclick="assignRandomizedOrder('${loot.name}')" class="w-full px-3 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition text-sm">
                            <i class="fas fa-arrow-right mr-1"></i>Assign to ${loot.name}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Store the shuffled order for assignment
    window.randomizedOrder = shuffled;
    
    resultDiv.classList.remove('hidden');
    showNotification('Members randomized!', 'success');
}

function assignRandomizedOrder(lootName) {
    if (!window.randomizedOrder) {
        showNotification('No randomized order available!', 'error');
        return;
    }
    
    if (!isAdmin) {
        showNotification('Admin access required!', 'error');
        return;
    }
    
    // Assign the randomized order to the specified loot
    lootRotations[lootName] = window.randomizedOrder.map(member => member.name);
    currentPlayerRotation[lootName] = 0;
    currentLootState[lootName] = 'pending';
    
    saveData();
    renderRotation();
    showNotification(`Randomized order assigned to ${lootName}!`, 'success');
}

// Rotation Management Functions
function initializeRotationManagement() {
    const select = document.getElementById('loot-select');
    select.innerHTML = '<option value="">Select Loot Item</option>' + 
        lootItems.map(loot => `<option value="${loot.name}">${loot.name}</option>`).join('');
    
    select.addEventListener('change', function() {
        const selectedLoot = this.value;
        if (selectedLoot) {
            showRotationManagement(selectedLoot);
        } else {
            document.getElementById('rotation-management').classList.add('hidden');
        }
    });
}

function showRotationManagement(lootName) {
    const managementDiv = document.getElementById('rotation-management');
    const listDiv = document.getElementById('rotation-list');
    
    const rotation = lootRotations[lootName] || [];
    
    listDiv.innerHTML = rotation.map((memberName, index) => `
        <div class="flex items-center justify-between p-3 bg-neutral-700 rounded-lg border border-neutral-600">
            <div class="flex items-center space-x-3 flex-1 min-w-0">
                <span class="text-sm font-bold text-blue-400 flex-shrink-0">#${index + 1}</span>
                <span class="text-white text-sm sm:text-base truncate">${memberName}</span>
            </div>
            <div class="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                ${isAdmin ? `
                    <button onclick="moveMemberUp('${lootName}', ${index})" class="p-2 text-blue-500 hover:text-blue-400 hover:bg-neutral-600 rounded transition min-h-[44px] min-w-[44px] flex items-center justify-center" ${index === 0 ? 'disabled style="opacity:0.3 cursor:not-allowed"' : ''} title="Move up">
                        <i class="fas fa-arrow-up text-sm"></i>
                    </button>
                    <button onclick="moveMemberDown('${lootName}', ${index})" class="p-2 text-blue-500 hover:text-blue-400 hover:bg-neutral-600 rounded transition min-h-[44px] min-w-[44px] flex items-center justify-center" ${index === rotation.length - 1 ? 'disabled style="opacity:0.3 cursor:not-allowed"' : ''} title="Move down">
                        <i class="fas fa-arrow-down text-sm"></i>
                    </button>
                    <button onclick="removeMemberFromRotation('${lootName}', ${index})" class="p-2 text-red-500 hover:text-red-400 hover:bg-neutral-600 rounded transition min-h-[44px] min-w-[44px] flex items-center justify-center" title="Remove from rotation">
                        <i class="fas fa-trash text-sm"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    managementDiv.classList.remove('hidden');
    
    // Store current loot for add operations
    window.currentRotationLoot = lootName;
}

// Admin member management functions
function moveMemberUp(lootName, index) {
    if (!isAdmin) {
        showNotification('Admin access required!', 'error');
        return;
    }
    
    if (index === 0) return; // Already at top
    
    const rotation = lootRotations[lootName];
    if (rotation && rotation.length > index) {
        // Swap with previous member
        [rotation[index], rotation[index - 1]] = [rotation[index - 1], rotation[index]];
        
        saveData();
        showRotationManagement(lootName);
        renderRotation();
        showNotification('Member moved up!', 'success');
    }
}

function moveMemberDown(lootName, index) {
    if (!isAdmin) {
        showNotification('Admin access required!', 'error');
        return;
    }
    
    const rotation = lootRotations[lootName];
    if (rotation && rotation.length > index && index < rotation.length - 1) {
        // Swap with next member
        [rotation[index], rotation[index + 1]] = [rotation[index + 1], rotation[index]];
        
        saveData();
        showRotationManagement(lootName);
        renderRotation();
        showNotification('Member moved down!', 'success');
    }
}

function addMemberToRotation() {
    if (!isAdmin) {
        showNotification('Admin access required!', 'error');
        return;
    }
    
    if (!window.currentRotationLoot) {
        showNotification('Please select a loot item first!', 'error');
        return;
    }
    
    // Show available members not in rotation
    const rotation = lootRotations[window.currentRotationLoot] || [];
    const availableMembers = guildMembers.filter(member => !rotation.includes(member.name));
    
    if (availableMembers.length === 0) {
        showNotification('All members are already in this rotation!', 'info');
        return;
    }
    
    const memberName = prompt('Available members:\n' + availableMembers.map(m => m.name).join('\n') + '\n\nEnter member name to add:');
    
    if (memberName && availableMembers.some(m => m.name === memberName)) {
        if (!lootRotations[window.currentRotationLoot]) {
            lootRotations[window.currentRotationLoot] = [];
        }
        lootRotations[window.currentRotationLoot].push(memberName);
        
        saveData();
        showRotationManagement(window.currentRotationLoot);
        renderRotation();
        showNotification(`${memberName} added to rotation!`, 'success');
    } else if (memberName) {
        showNotification('Invalid member name!', 'error');
    }
}

function removeMemberFromRotation(lootName, index) {
    if (!isAdmin) {
        showNotification('Admin access required!', 'error');
        return;
    }
    
    const rotation = lootRotations[lootName];
    if (rotation && rotation.length > index) {
        const removedMember = rotation.splice(index, 1)[0];
        saveData();
        showRotationManagement(lootName);
        renderRotation();
        showNotification(`${removedMember} removed from rotation!`, 'info');
    }
}

function randomizeRotation() {
    if (!isAdmin) {
        showNotification('Admin access required!', 'error');
        return;
    }
    
    if (!window.currentRotationLoot) {
        showNotification('Please select a loot item first!', 'error');
        return;
    }
    
    const rotation = lootRotations[window.currentRotationLoot];
    if (!rotation || rotation.length === 0) {
        showNotification('No members in rotation to randomize!', 'error');
        return;
    }
    
    // Shuffle the rotation
    const shuffled = [...rotation].sort(() => Math.random() - 0.5);
    lootRotations[window.currentRotationLoot] = shuffled;
    
    saveData();
    showRotationManagement(window.currentRotationLoot);
    renderRotation();
    showNotification('Rotation randomized!', 'success');
}

// Admin item management functions
function deleteLootItem(lootName) {
    if (!isAdmin) {
        showNotification('Admin access required!', 'error');
        return;
    }
    
    if (confirm(`Are you sure you want to delete "${lootName}"? This will remove it from all rotations and cannot be undone.`)) {
        // Remove from loot items
        lootItems = lootItems.filter(item => item.name !== lootName);
        
        // Remove from rotations
        delete lootRotations[lootName];
        
        // Remove from current states
        delete currentLootState[lootName];
        delete currentPlayerRotation[lootName];
        
        // Remove from skipped items
        skippedItems = skippedItems.filter(item => item.lootName !== lootName);
        
        saveData();
        renderRotation();
        renderLoot();
        updateStats();
        showNotification(`${lootName} deleted successfully!`, 'success');
    }
}

// Admin functions
function toggleAdminLogin() {
    if (isAdmin) {
        logout();
    } else {
        showAdminLoginModal();
    }
}

function showAdminLoginModal() {
    document.getElementById('admin-login-modal').classList.remove('hidden');
    document.getElementById('admin-password').value = '';
    document.getElementById('login-error').classList.add('hidden');
}

function hideAdminLoginModal() {
    document.getElementById('admin-login-modal').classList.add('hidden');
}

function attemptLogin() {
    const password = document.getElementById('admin-password').value;
    if (password === ADMIN_PASSWORD) {
        isAdmin = true;
        hideAdminLoginModal();
        updateAdminUI();
        showNotification('Logged in as Admin!', 'success');
    } else {
        document.getElementById('login-error').classList.remove('hidden');
    }
}

function logout() {
    isAdmin = false;
    updateAdminUI();
    showNotification('Logged out', 'info');
}

function updateAdminUI() {
    const adminElements = document.querySelectorAll('.admin-only');
    const adminBtn = document.getElementById('admin-btn');
    const adminBtnText = document.getElementById('admin-btn-text');
    
    if (isAdmin) {
        adminElements.forEach(el => el.classList.remove('hidden'));
        adminBtn.classList.remove('bg-red-800', 'hover:bg-red-900');
        adminBtn.classList.add('bg-neutral-700', 'hover:bg-neutral-600');
        adminBtnText.textContent = 'Logout';
        adminBtn.querySelector('i').classList.remove('fa-lock');
        adminBtn.querySelector('i').classList.add('fa-unlock');
    } else {
        adminElements.forEach(el => el.classList.add('hidden'));
        adminBtn.classList.remove('bg-neutral-700', 'hover:bg-neutral-600');
        adminBtn.classList.add('bg-red-800', 'hover:bg-red-900');
        adminBtnText.textContent = 'Admin';
        adminBtn.querySelector('i').classList.remove('fa-unlock');
        adminBtn.querySelector('i').classList.add('fa-lock');
    }
    
    // Re-render rotation to show/hide controls
    renderRotation();
}

// Boss Timer Functions
function updateBossTimers() {
    // Dubai is UTC+4, Philippines is UTC+8
    // 9am Dubai = 1pm PH, 5pm Dubai = 9pm PH
    const now = new Date();
    const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    
    // Boss times in PH (1:00 PM and 9:00 PM)
    const morningBoss = new Date(phTime);
    morningBoss.setHours(13, 0, 0, 0); // 1:00 PM PH
    
    const eveningBoss = new Date(phTime);
    eveningBoss.setHours(21, 0, 0, 0); // 9:00 PM PH
    
    // If morning boss has passed, set it for tomorrow
    if (phTime > morningBoss) {
        morningBoss.setDate(morningBoss.getDate() + 1);
    }
    
    // If evening boss has passed, set it for tomorrow
    if (phTime > eveningBoss) {
        eveningBoss.setDate(eveningBoss.getDate() + 1);
    }
    
    // Calculate countdowns
    const morningDiff = morningBoss - phTime;
    const eveningDiff = eveningBoss - phTime;
    
    // Update countdown displays
    document.getElementById('morning-countdown').textContent = formatCountdown(morningDiff);
    document.getElementById('evening-countdown').textContent = formatCountdown(eveningDiff);
    
    // Show alert if boss is within 30 minutes
    const alertEl = document.getElementById('next-boss-alert');
    if (morningDiff < 30 * 60 * 1000 || eveningDiff < 30 * 60 * 1000) {
        alertEl.classList.remove('hidden');
    } else {
        alertEl.classList.add('hidden');
    }
}

function formatCountdown(ms) {
    if (ms < 0) return 'NOW!';
    
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    if (hours > 0) {
        return `in ${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `in ${minutes}m ${seconds}s`;
    } else {
        return `in ${seconds}s`;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeData();
    initializeLootSystem();
    initializeRotationManagement();
    updateBossTimers();
    setInterval(updateBossTimers, 1000); // Update every second
    // Vercel deployment trigger - admin features added
});

// Close modals when clicking outside
document.getElementById('add-member-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideAddMemberModal();
    }
});

document.getElementById('add-loot-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideAddLootModal();
    }
});

document.getElementById('admin-login-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideAdminLoginModal();
    }
});

document.getElementById('loot-action-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideLootActionModal();
    }
});

document.getElementById('swap-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideSwapModal();
    }
});

document.getElementById('add-queue-item-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideAddQueueItemModal();
    }
});

// Allow Enter key to submit login
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !document.getElementById('admin-login-modal').classList.contains('hidden')) {
        attemptLogin();
    }
});
