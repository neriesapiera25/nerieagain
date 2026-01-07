// Data storage
let guildMembers = [];
let lootItems = [];
let rotationHistory = [];
let lootRotations = {}; // Stores rotation order per loot item
let rotationsToday = 0;

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
    updateStats();
    renderRotation();
    renderMembers();
    renderLoot();
    renderHistory();
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

function resetRotation() {
    currentPositions = {};
    lootItems.forEach(loot => {
        currentPositions[loot.name] = 0;
    });
    rotationsToday = 0;
    saveData();
    renderRotation();
    updateStats();
    showNotification('Rotation reset to start!', 'info');
}

function renderRotation() {
    const container = document.getElementById('rotation-display');
    
    // Initialize positions if needed
    lootItems.forEach(loot => {
        if (currentPositions[loot.name] === undefined) {
            currentPositions[loot.name] = 0;
        }
    });

    container.innerHTML = `
        <!-- Current Turn Summary - TOP -->
        <div class="col-span-full mb-6 bg-neutral-800 rounded-lg p-4 border border-red-900/50">
            <h3 class="text-lg font-bold text-white mb-3"><i class="fas fa-star mr-2 text-red-500"></i>Current Turn</h3>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                ${lootItems.map(loot => {
                    const currentMember = lootRotations[loot.name]?.[currentPositions[loot.name]] || 'N/A';
                    return `
                        <div class="bg-neutral-900 rounded-lg p-3 text-center border border-neutral-700">
                            <p class="text-xs text-gray-500 mb-1">${loot.name}</p>
                            <p class="font-bold text-white">${currentMember}</p>
                            ${isAdmin ? `
                                <button onclick="advanceLoot('${loot.name}')" class="mt-2 px-3 py-1 bg-red-700 text-white text-xs rounded hover:bg-red-800 transition w-full">
                                    <i class="fas fa-check mr-1"></i>Looted
                                </button>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
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
                    const isCurrent = currentPositions[loot.name] === i;
                    return `
                        <td class="p-3 border-b border-neutral-800 text-center ${isCurrent ? 'bg-red-900/30 font-bold text-white' : 'text-gray-400'}">
                            ${isCurrent ? '<i class="fas fa-arrow-right mr-2 text-red-500"></i>' : ''}
                            ${member}
                        </td>
                    `;
                }).join('')}
            </tr>
        `;
    }
    return rows;
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
        <div class="bg-neutral-800 rounded-lg p-4 border border-neutral-700 hover:border-red-900 transition">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center space-x-3">
                    <div class="w-12 h-12 bg-neutral-700 rounded-full flex items-center justify-center">
                        <i class="fas fa-user text-white"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-white">${member.name}</h3>
                        <p class="text-sm text-gray-500 capitalize">${member.class}</p>
                    </div>
                </div>
                <button onclick="removeMember(${member.id})" class="text-red-500 hover:text-red-400 transition">
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
        <div class="bg-neutral-800 rounded-lg p-4 border border-neutral-700 hover:border-red-900 transition">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center space-x-2">
                    <i class="fas fa-treasure-chest text-white"></i>
                    <div>
                        <h3 class="font-bold text-white text-sm">${loot.name}</h3>
                        <p class="text-xs text-gray-500">${loot.type}</p>
                    </div>
                </div>
                <button onclick="removeLoot(${loot.id})" class="text-red-500 hover:text-red-400 transition">
                    <i class="fas fa-trash"></i>
                </button>
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
        if (entry.type === 'single') {
            // Single loot entry
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
                            <p class="text-xs text-gray-500">Next: ${entry.nextMember}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-gray-500">${new Date(entry.timestamp).toLocaleString()}</p>
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
                            ${new Date(entry.timestamp).toLocaleString()}
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
        rotationsToday
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
    updateBossTimers();
    setInterval(updateBossTimers, 1000); // Update every second
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

// Allow Enter key to submit login
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !document.getElementById('admin-login-modal').classList.contains('hidden')) {
        attemptLogin();
    }
});
