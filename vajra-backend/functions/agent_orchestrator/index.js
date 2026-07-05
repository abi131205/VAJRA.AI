const catalyst = require('zcatalyst-sdk-node');
const TimelineAgent = require('./agents/timelineAgent');
const LegalAgent = require('./agents/legalAgent');
const SQLAgent = require('./agents/sqlAgent');

/**
 * Zoho Catalyst Function - Agent Orchestrator
 * Coordinates multi-agent workflows and event-triggered intelligence tasks.
 */
module.exports = async (context, basicIO) => {
    try {
        // Initialize Catalyst Node SDK
        const catalystApp = catalyst.initialize(context);
        
        // Read input arguments
        const taskType = basicIO.getArgument('task_type'); // e.g. RECONSTRUCT_TIMELINE
        const payload = basicIO.getArgument('payload');     // target string or parameters

        if (!taskType || !payload) {
            basicIO.write(JSON.stringify({ error: "Missing task_type or payload arguments" }));
            context.close();
            return;
        }

        let result = null;

        switch (taskType) {
            case 'RECONSTRUCT_TIMELINE': {
                const timelineAgent = new TimelineAgent(catalystApp);
                const events = await timelineAgent.extractEvents(payload);
                result = { events };
                break;
            }
            case 'MAP_LEGAL_SECTIONS': {
                const legalAgent = new LegalAgent(catalystApp);
                const eventsArray = typeof payload === 'string' ? JSON.parse(payload) : payload;
                const recommendations = await legalAgent.mapLegalSections(eventsArray);
                result = { recommendations };
                break;
            }
            case 'QUERY_DATABASE': {
                const sqlAgent = new SQLAgent(catalystApp);
                const rows = await sqlAgent.executeSearch(payload);
                result = { rows };
                break;
            }
            default:
                result = { error: `Unsupported task type: ${taskType}` };
        }

        // Return processed JSON
        basicIO.write(JSON.stringify({
            status: "SUCCESS",
            task: taskType,
            data: result,
            timestamp: new Date().toISOString()
        }));

    } catch (err) {
        console.error("Agent Orchestrator Execution Failure:", err);
        basicIO.write(JSON.stringify({
            status: "ERROR",
            error: err.message,
            timestamp: new Date().toISOString()
        }));
    } finally {
        context.close();
    }
};
