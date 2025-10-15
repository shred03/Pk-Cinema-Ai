const { format } = require('date-fns');
const os = require('os');
const mongoose = require('mongoose');
const File = require('../models/File');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../logs/Logs')


const formatISTTime = (date) => {
    return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
};


const getStatus = async () => {
    try {
        // System info
        const uptime = formatUptime(process.uptime());
        const memory = {
            total: formatBytes(os.totalmem()),
            free: formatBytes(os.freemem()),
            used: formatBytes(os.totalmem() - os.freemem()),
            usagePercent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
        };
        
        // Database stats
        const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
        
        // Today's stats
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        
        const [
            fileCount,
            filesToday,
            userCount,
            newUsersToday
        ] = await Promise.all([
            File.countDocuments({}),
            File.countDocuments({ timestamp: { $gte: todayStart } }),
            User.countDocuments({}),
            User.countDocuments({ created_at: { $gte: todayStart } })
        ]);
        
        // Admin count from config
        const ADMIN_IDS = config.ADMIN_IDS.split(',').map(id => parseInt(id));
        const adminCount = ADMIN_IDS.length;
        
        // Get unique file IDs
        const uniqueFileIds = await File.distinct('unique_id');
        
        // Recent logs
        const logs = await getRecentLogs();
        
        // CPU load
        const cpuLoad = os.loadavg()[0].toFixed(2);
        
        const statusData = {
            timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
            istTimestamp: formatISTTime(new Date()),
            system: {
                platform: os.platform(),
                arch: os.arch(),
                hostname: os.hostname(),
                uptime: uptime,
                cpuLoad: cpuLoad,
                memory: memory
            },
            database: {
                status: dbStatus,
                stats: {
                    files: fileCount,
                    filesToday: filesToday,
                    uniqueLinks: uniqueFileIds.length,
                    users: userCount,
                    newUsersToday: newUsersToday,
                    admins: adminCount
                }
            },
            logs: logs
        };
        
        return {
            ...statusData,
            html: generateStatusHTML(statusData)
        };
    } catch (error) {
        console.error('Error getting status:', error);
        return {
            error: 'Failed to get status',
            message: error.message,
            html: generateErrorHTML(error)
        };
    }
};


const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};


const formatUptime = (seconds) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
};

const getRecentLogs = async () => {
    try {
        const logsDir = path.join(__dirname, '..', 'logs', 'files');
        
        if (!fs.existsSync(logsDir)) {
            return [];
        }
        
        const today = format(new Date(), 'yyyy-MM-dd');
        const logFile = path.join(logsDir, `${today}.log`);
        
        if (!fs.existsSync(logFile)) {
            return [];
        }
        
        const logData = fs.readFileSync(logFile, 'utf8');
        const logLines = logData.split('\n').filter(line => line.trim() !== '');
        
        // Get the last 10 log entries
        return logLines.slice(-10).map(line => {
            const parts = line.match(/\[(.*?)\] (.*?) - User: (.*?)\((.*?)\) - Command: (.*?) - Status: (.*?)(?:$| - Details: (.*))/);
            
            if (!parts) return { raw: line };
            
            return {
                timestamp: parts[1],
                type: parts[2],
                username: parts[3],
                userId: parts[4],
                command: parts[5],
                status: parts[6],
                details: parts[7] || ''
            };
        });
    } catch (error) {
        console.error('Error reading logs:', error);
        return [];
    }
};


const generateStatusHTML = (status) => {
    // Create a memory usage bar
    const memoryBar = `
        <div class="progress" style="height: 20px;">
            <div class="progress-bar ${getProgressBarClass(status.system.memory.usagePercent)}" 
                role="progressbar" 
                style="width: ${status.system.memory.usagePercent}%;" 
                aria-valuenow="${status.system.memory.usagePercent}" 
                aria-valuemin="0" 
                aria-valuemax="100">
                ${status.system.memory.usagePercent}%
            </div>
        </div>
    `;
    
    // Create log table rows
    const logRows = status.logs.map(log => {
        if (log.raw) return `<tr><td colspan="6">${log.raw}</td></tr>`;
        
        return `
            <tr>
                <td>${log.timestamp}</td>
                <td><span class="badge ${getLogBadgeClass(log.type)}">${log.type}</span></td>
                <td>${log.username}</td>
                <td>${log.command}</td>
                <td><span class="badge ${getStatusBadgeClass(log.status)}">${log.status}</span></td>
                <td>${log.details}</td>
            </tr>
        `;
    }).join('');
    
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bot Status</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body {
                    padding: 20px;
                    background-color: #f8f9fa;
                }
                .card {
                    margin-bottom: 20px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
                .card-header {
                    font-weight: bold;
                    background-color: #f1f2f3;
                }
                .stats-value {
                    font-size: 24px;
                    font-weight: bold;
                }
                .stats-label {
                    font-size: 14px;
                    color: #6c757d;
                }
                .stats-today {
                    font-size: 12px;
                    color: #28a745;
                }
                .system-info {
                    font-size: 14px;
                }
                .table-responsive {
                    max-height: 400px;
                    overflow-y: auto;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1 class="mb-4">PK Cinema Bot Status Dashboard</h1>
                <p class="text-muted">Last updated: ${status.istTimestamp}</p>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">System Information</div>
                            <div class="card-body">
                                <div class="system-info">
                                    <p><strong>Platform:</strong> ${status.system.platform} (${status.system.arch})</p>
                                    <p><strong>Hostname:</strong> ${status.system.hostname}</p>
                                    <p><strong>Uptime:</strong> ${status.system.uptime}</p>
                                    <p><strong>CPU Load:</strong> ${status.system.cpuLoad}</p>
                                    <p><strong>Memory Usage:</strong> 
                                        ${status.system.memory.used} of ${status.system.memory.total} 
                                        (${status.system.memory.free} free)
                                    </p>
                                    ${memoryBar}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">Database Status</div>
                            <div class="card-body">
                                <p>
                                    <span class="badge ${status.database.status === 'Connected' ? 'bg-success' : 'bg-danger'}">
                                        ${status.database.status}
                                    </span>
                                </p>
                                
                                <div class="row text-center">
                                    <div class="col-6 col-md-3 mb-3">
                                        <div class="stats-value">${status.database.stats.files}</div>
                                        <div class="stats-label">Files</div>
                                        <div class="stats-today">+${status.database.stats.filesToday} today</div>
                                    </div>
                                    <div class="col-6 col-md-3 mb-3">
                                        <div class="stats-value">${status.database.stats.uniqueLinks}</div>
                                        <div class="stats-label">Unique Links</div>
                                    </div>
                                    <div class="col-6 col-md-3 mb-3">
                                        <div class="stats-value">${status.database.stats.users}</div>
                                        <div class="stats-label">Users</div>
                                        <div class="stats-today">+${status.database.stats.newUsersToday} today</div>
                                    </div>
                                    <div class="col-6 col-md-3 mb-3">
                                        <div class="stats-value">${status.database.stats.admins}</div>
                                        <div class="stats-label">Admins</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">Recent Logs</div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped table-sm">
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>Type</th>
                                        <th>User</th>
                                        <th>Command</th>
                                        <th>Status</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${logRows}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <footer class="mt-4 text-center text-muted">
                    <p>PK Cinema Bot Status Dashboard &copy; ${new Date().getFullYear()}</p>
                </footer>
            </div>
        </body>
        </html>
    `;
};


const generateErrorHTML = (error) => {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Status Error</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body>
            <div class="container mt-5">
                <div class="card text-white bg-danger">
                    <div class="card-header">Error</div>
                    <div class="card-body">
                        <h5 class="card-title">Failed to get status</h5>
                        <p class="card-text">${error.message}</p>
                        <pre>${error.stack}</pre>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
};


const getProgressBarClass = (percent) => {
    if (percent >= 90) return 'bg-danger';
    if (percent >= 70) return 'bg-warning';
    return 'bg-success';
};


const getLogBadgeClass = (type) => {
    const types = {
        'ERROR': 'bg-danger',
        'COMMAND': 'bg-primary',
        'INFO': 'bg-info',
        'ADMIN': 'bg-warning'
    };
    
    return types[type] || 'bg-secondary';
};


const getStatusBadgeClass = (status) => {
    if (status === 'SUCCESS') return 'bg-success';
    if (status === 'FAILED') return 'bg-danger';
    return 'bg-secondary';
};

module.exports = {
    getStatus,
    formatBytes,
    formatUptime,
    formatISTTime
};