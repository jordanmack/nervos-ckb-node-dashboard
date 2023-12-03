import {useEffect, useState} from 'react';
import useInterval from 'react-useinterval';
import {Area, AreaChart, Tooltip, TooltipProps} from 'recharts';
import {ValueType, NameType} from 'recharts/types/component/DefaultTooltipContent';
import './App.scss';

/**
 * Constants
 */
const CKB_RPC_URL = 'http://127.0.0.1:8114';		// The JSON RPC URL of the CKB Full Node to query.
const EPOCHS_PER_HALVING = 8760;					// The number of epochs per halving. This should never change.
const HOURS_PER_EPOCH = 4;							// The number of hours per epoch. This should never change.
const HALVING_MESSAGE_HIDE_DELAY = 10 * 60 * 1000;	// The delay in milliseconds to continue to display the halving message after it occurs.
const TICK_DELAY = 500;								// The delay in milliseconds to update the countdown.
const REFRESH_DELAY = 1.7 * 1000;					// The delay in milliseconds to refresh the RPC data and update the current block and epoch.
const FULL_REFRESH_DELAY = 5 * 60 * 1000;			// The delay in milliseconds to refresh all RPC data and update all current values and target values.
const MAX_TX_HISTORY_COUNT = 100;					// The maximum number of entries in the TX history, used for the graph.

/**
 * Types and Defaults
 */

/// History values for a specific block.
type HistoryState =
{
	blockNumber: number;
	cyclesConsumed: number;
	txCount: number;
};

/// Container for all the current data retrieved from the RPC.
type CurrentData =
{
	block: number,
	chainType: string,
	connections: number,
	epoch: number,
	epochIndex: number,
	epochLength: number,
	historyState: HistoryState,
	minFeeRate: number,
	nodeVersion: string,
	orphan: number,
	pending: number,
	proposed: number,
	targetEpoch: number,
	targetTime: number,
	totalTxCycles: number,
	txSize: number
};

/// A time value separated into components for a future date.
type TimeValue =
{
	months: number,
	days: number,
	hours: number,
	minutes: number,
	seconds: number
};

/// The default values for a CurrentData object.
const currentDataDefault: CurrentData =
{
	block: 0,
	chainType: "",
	connections: 0,
	epoch: 0,
	epochIndex: 0,
	epochLength: 0,
	historyState:
	{
		blockNumber: 0,
		cyclesConsumed: 0,
		txCount: 0
	},
	minFeeRate: 0,
	nodeVersion: "",
	orphan: 0,
	pending: 0,
	proposed: 0,
	targetEpoch: 0,
	targetTime: 0,
	totalTxCycles: 0,
	txSize: 0
};

/**
 * Generates time values in months, days, hours, minutes, and seconds based on the time remaining in the countdown.
 * @param timeFromNow The number of milliseconds until the target time.
 * @returns TimeValue
 */
function calculateTimeValue(timeFromNow: number)
{
	// Time constants (in milliseconds).
	const second = 1000;
	const minute = second * 60;
	const hour = minute * 60;
	const day = hour * 24;
	const month = day * 30;

	// Calculate values for the target.
	const months = Math.floor((timeFromNow) / month);
	const days = Math.floor((timeFromNow - (months * month)) / day);
	const hours = Math.floor((timeFromNow - (days * day + months * month)) / hour);
	const minutes = Math.floor((timeFromNow - (hours * hour + days * day + months * month)) / minute);
	const seconds = Math.floor((timeFromNow - (minutes * minute + hours * hour + days * day + months * month)) / second);

	// Create the time object from the target values.
	let object: TimeValue = {months: 0, days: 0, hours: 0, minutes: 0, seconds: 0};
	object.months = months;
	object.days = days;
	object.hours = hours;
	object.minutes = minutes;
	object.seconds = seconds;

	return object;
}

/**
 * Generate the target date string depending on the target epoch and target time.
 * @param targetEpoch The epoch of the next halving.
 * @param targetTime The approximate time of the next halving.
 * @returns A string containing the target date.
 */
function generateTargetString(targetEpoch: number, targetTime: number)
{
	// Set the default string to nbsp to ensure the line is always normal height.
	let string = '';

	// Set the target string.
	if(targetEpoch)
	{
		const date = (new Date(targetTime)).toLocaleDateString('en-us', { weekday:"long", year:"numeric", month:"short", day:"numeric"});
		string = `${date.replaceAll(' ', ' ')}`;
	}

	return string;
}

/**
 * Generate the countdown string or a halving message immediately after the halving.
 * @param targetTime The approximate time of the next halving.
 * @returns A string representing the remaining time in the countdown.
 */
function generateCountdown(targetTime: number)
{
	if(targetTime)
	{
		const timeRemaining = targetTime - Date.now();
		const halvingMessageWindow = EPOCHS_PER_HALVING * HOURS_PER_EPOCH * 60 * 60 * 1000 - HALVING_MESSAGE_HIDE_DELAY;

		// If there is still time remaining then display the countdown, unless it is immediately after the halving within the hide delay window.
		if(timeRemaining > 0 && timeRemaining < halvingMessageWindow)
		{
			const timeValue = calculateTimeValue(timeRemaining);
			const countdown = `${timeValue.months}m, ${timeValue.days}d, ${timeValue.hours}h, ${timeValue.minutes}m, ${timeValue.seconds}s`;

			return countdown;
		}
		// Display a halving message instead of a time.
		else
		{
			const countdown = "🎉🎈Happy Halving!🎈🎉";

			return countdown;
		}
	}

	return "";
}

/**
 * Update all data using the CKB JSON RPC.
 * @param currentData An object containing all the current data elements.
 * @param setCurrentData A React function to set the current data state variable.
 * @param options An optional object containing options for updating the data.
 */
async function updateData(currentData: CurrentData, setCurrentData: React.Dispatch<React.SetStateAction<CurrentData>>, options: {updateTargets: boolean}={updateTargets: true})
{
	// Fetch current data from the CKB node. (RPC Documentation: https://github.com/nervosnetwork/ckb/blob/master/rpc/README.md#method-get_tip_header)
	const jsonRpcRequest1 =
	{
		"id": 1,
		"jsonrpc": "2.0",
		"method": "get_tip_header",
		"params": []
	};
	const fetchRequest1 =
	{
		method: 'POST',
		headers:
		{
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(jsonRpcRequest1)
	}
	let {result: {epoch: epochNumberWithFraction, number: blockNumber}} = await fetch(CKB_RPC_URL, fetchRequest1).then(res => res.json());

	// Decode block number. (RPC Documentation: https://github.com/nervosnetwork/ckb/blob/master/rpc/README.md#type-blocknumber)
	blockNumber = Number(blockNumber);

	// Decode the epoch data into usable components. (RPC Documentation: https://github.com/nervosnetwork/ckb/blob/master/rpc/README.md#type-epochnumberwithfraction)
	epochNumberWithFraction = BigInt(epochNumberWithFraction);
	const epochLength = Number((epochNumberWithFraction & 72056494526300160n) >> 40n);
	const epochIndex = Number((epochNumberWithFraction & 1099494850560n) >> 24n);
	const epochNumber = Number(epochNumberWithFraction & 16777215n);

	// Calculate the target epoch.
	const targetEpoch = Math.floor(epochNumber / EPOCHS_PER_HALVING) * EPOCHS_PER_HALVING + EPOCHS_PER_HALVING;

	// Calculate the duration and time of the target epoch.
	const targetDuration = Math.floor((targetEpoch - (epochNumber + (epochIndex / epochLength))) * HOURS_PER_EPOCH * 60*60*1000); // Time until epoch in milliseconds.
	const targetTime = Date.now() + targetDuration; // Date in the future when the epoch will occur.

	// Fetch current data from the CKB node. (RPC Documentation: https://github.com/nervosnetwork/ckb/blob/master/rpc/README.md#method-get_blockchain_info)
	const jsonRpcRequest2 =
	{
		"id": 2,
		"jsonrpc": "2.0",
		"method": "get_blockchain_info",
		"params": []
	};
	const fetchRequest2 =
	{
		method: 'POST',
		headers:
		{
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(jsonRpcRequest2)
	}
	let {result: {chain: chainTypeString}} = await fetch(CKB_RPC_URL, fetchRequest2).then(res => res.json());

	// Decode values.
	chainTypeString = (chainTypeString === "ckb") ? "Mainnet" : "Testnet";

	// Fetch current data from the CKB node. (RPC Documentation: https://github.com/nervosnetwork/ckb/blob/master/rpc/README.md#method-local_node_info)
	const jsonRpcRequest3 =
	{
		"id": 3,
		"jsonrpc": "2.0",
		"method": "local_node_info",
		"params": []
	};
	const fetchRequest3 =
	{
		method: 'POST',
		headers:
		{
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(jsonRpcRequest3)
	}
	let {result: {connections: connectionsNumber, version: nodeVersion}} = await fetch(CKB_RPC_URL, fetchRequest3).then(res => res.json());

	// Decode values.
	connectionsNumber = Number(connectionsNumber);
	nodeVersion = "v" + nodeVersion.split(" ")[0]; // Take only the first version of the string.

	// Fetch current data from the CKB node. (RPC Documentation: https://github.com/nervosnetwork/ckb/blob/master/rpc/README.md#method-tx_pool_info)
	const jsonRpcRequest4 =
	{
		"id": 4,
		"jsonrpc": "2.0",
		"method": "tx_pool_info",
		"params": []
	};
	const fetchRequest4 =
	{
		method: 'POST',
		headers:
		{
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(jsonRpcRequest4)
	}
	let {result: {orphan: orphanTxNumber, pending: pendingTxNumber, proposed: proposedTxNumber, total_tx_cycles: totalTxCyclesNumber, total_tx_size: totalTxSizeNumber, tx_size_limit: txSizeLimitNumber}} = await fetch(CKB_RPC_URL, fetchRequest4).then(res => res.json());

	// Decode values.
	orphanTxNumber = BigInt(orphanTxNumber);
	pendingTxNumber = BigInt(pendingTxNumber);
	proposedTxNumber = BigInt(proposedTxNumber);
	totalTxCyclesNumber = BigInt(totalTxCyclesNumber);
	totalTxSizeNumber = BigInt(totalTxSizeNumber);
	txSizeLimitNumber = BigInt(txSizeLimitNumber);

	// Fetch current data from the CKB node. (RPC Documentation: https://github.com/nervosnetwork/ckb/blob/master/rpc/README.md#method-get_block_by_number)
	const jsonRpcRequest5 =
	{
		"id": 5,
		"jsonrpc": "2.0",
		"method": "get_block_by_number",
		"params": ["0x"+blockNumber.toString(16), "0x2", true] // blockNumber pulled from get_tip_header().
	};
	const fetchRequest5 =
	{
		method: 'POST',
		headers:
		{
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(jsonRpcRequest5)
	}
	let {result: {block: {transactions: transactionsArray}, cycles: cyclesArray}} = await fetch(CKB_RPC_URL, fetchRequest5).then(res => res.json());

	// Decode values.
	const historyState = {blockNumber: blockNumber, txCount: transactionsArray.length, cyclesConsumed: cyclesArray.map((x: string)=>Number(x)).reduce((a: number, b: number) => a+b, 0)};

	// Update values.
	const newCurrentData = {...currentData};
	newCurrentData.block = blockNumber; // get_tip_header()
	newCurrentData.epoch = epochNumber; // get_tip_header()
	newCurrentData.epochIndex = epochIndex; // get_tip_header()
	newCurrentData.epochLength = epochLength; // get_tip_header()
	newCurrentData.chainType = chainTypeString; // get_blockchain_info()
	newCurrentData.connections = connectionsNumber; // local_node_info()
	newCurrentData.nodeVersion = nodeVersion; // local_node_info()
	newCurrentData.orphan = orphanTxNumber; // tx_pool_info()
	newCurrentData.pending = pendingTxNumber; // tx_pool_info()
	newCurrentData.proposed = proposedTxNumber; // tx_pool_info()
	newCurrentData.totalTxCycles = totalTxCyclesNumber; // tx_pool_info()
	newCurrentData.txSize = totalTxSizeNumber; // tx_pool_info()
	newCurrentData.minFeeRate = txSizeLimitNumber; // tx_pool_info()
	newCurrentData.historyState = historyState; // get_block()
	if(options.updateTargets)
	{
		newCurrentData.targetEpoch = targetEpoch; // get_tip_header()
		newCurrentData.targetTime = targetTime; // get_tip_header()
	}
	setCurrentData(newCurrentData);
}

/**
 * Update the tx history state with the current history state provided, if it contains new data.
 * @param currentHistoryState A HistoryState object with data to be imported.
 * @param txHistory An array of existing history states.
 * @param setTxHistory A React function to set the current tx history state variable.
 */
async function updateTxHistoryData(currentHistoryState: HistoryState|null, txHistory: Array<HistoryState>, setTxHistory: React.Dispatch<React.SetStateAction<Array<HistoryState>>>|null)
{
	// Check the current history to see if the current reported TX count does not already exist.
	if(!!currentHistoryState && !!currentHistoryState.blockNumber && !txHistory.map((x)=>x.blockNumber).includes(currentHistoryState.blockNumber))
	{
		// Operate on a clone to prevent allow React to track changes properly.
		const txHistoryNew = txHistory.slice(0);

		// If the max number of history items already exists, remove the first one.
		if(txHistoryNew.length === MAX_TX_HISTORY_COUNT)
			txHistoryNew.shift();

		// Add in the new TX history entry.
		txHistoryNew.push(currentHistoryState);

		// Update values where a setter was provided.
		if(setTxHistory) setTxHistory(txHistoryNew);
	}
}

/**
 * Generates a large sized grid panel.
 * @param label The label to display in the corner.
 * @param value The primary value displayed in a large font.
 * @param smallValue The second value displayed in a smaller font.
 * @returns Rendered React element containing a single grid panel.
 */
function renderGridLarge(label: string, value: string, smallValue?: string|undefined)
{
	const smallString = (!!smallValue) ? <>{" "}<small>{smallValue}</small></> : null;
	const html =
	(
		<div className="inline-block relative bg-gray-700 h-[calc(var(--app-height)*70/480)] col-span-3">
			<span className="absolute text-[0.7rem] text-slate-500 left-2.5 top-0.5">{label}</span>
			<span className="block relative h-[calc(var(--app-height)*50/480)] top-[calc(var(--app-height)*20/480)] w-full bg-transparent text-slate-300 p-2.5 pt-1 text-4xl">{value}{smallString}</span>
		</div>
	);
	return html;
}

/**
 * Generates a small sized grid panel.
 * @param label The label to display in the corner.
 * @param value The primary value displayed in a large font.
 * @param smallValue The second value displayed in a smaller font.
 * @returns Rendered React element containing a single grid panel.
 */
function renderGridSmall(label: string, value: string, smallValue?: string|undefined)
{
	const smallString = (!!smallValue) ? <>{" "}<small>{smallValue}</small></> : null;
	const html =
	(
		<div className="inline-block relative bg-gray-700 h-[calc(var(--app-height)*55/480)] col-span-2">
			<span className="absolute text-[0.7rem] text-slate-500 left-2.5 top-0.5">{label}</span>
			<span className="block relative h-[calc(var(--app-height)*40/480)] top-[calc(var(--app-height)*15/480)] w-full bg-transparent text-slate-300 p-2.5 pt-1 text-xl">{value}{smallString}</span>
		</div>
	);
	return html;
}

/**
 * Renders the two charts on the bottom of the screen.
 * @param txHistory A populated HistoryState array containing the data to generate the chart from.
 * @returns Rendered React element containing the history charts.
 */
function renderCharts(txHistory: HistoryState[])
{
	/// Generates a tooltip for the chart.
	const CustomTooltip = ({active, payload, label: _}: TooltipProps<ValueType, NameType>) =>
	{
		if(active && payload && payload.length)
		{
			const html =
			(
				<div className="custom-tooltip bg-slate-600 p-2">
					<p className="m-0">Block Number: {payload[0].payload.blockNumber.toLocaleString()}</p>
					<p className="m-0">TX Count: {payload[0].payload.txCount.toLocaleString()}</p>
					<p className="m-0">Cycles Consumed: {payload[0].payload.cyclesConsumed.toLocaleString()}</p>
				</div>
			);

			return html;
		}

		return null;
	};

	const html =
	(
		<>
			<AreaChart width={window.innerWidth-61} height={calculateAppDimensions().height*69/480} data={txHistory} margin={{top: 2, right: 0, bottom: 0, left: 0}} syncId="AreaChartSyncId">
				<Tooltip content={()=>null} />
				<defs>
					<linearGradient id="colorGreenGradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="5%" stopColor="#3cc68a" stopOpacity={0.8} />
						<stop offset="95%" stopColor="#3cc68a" stopOpacity={0} />
					</linearGradient>
				</defs>
				<Area type="monotone" dataKey="txCount" stroke="#3cc68a" fillOpacity={1} fill="url(#colorGreenGradient)" isAnimationActive={false} />
			</AreaChart>
			<AreaChart width={window.innerWidth-61} height={calculateAppDimensions().height*69/480} data={txHistory} margin={{top: 0, right: 0, bottom: 0, left: 0}} syncId="AreaChartSyncId">
				<Tooltip content={CustomTooltip} offset={50} position={{y: -35}} />
				<defs>
					<linearGradient id="purpleGreenGradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
						<stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
					</linearGradient>
				</defs>
				<Area type="monotone" dataKey="cyclesConsumed" stroke="#8884d8" fillOpacity={1} fill="url(#purpleGreenGradient)" isAnimationActive={false} />
			</AreaChart>
		</>
	);

	return html;
}

/**
 * Calculates the dimensions of the application based on the window viewport size.
 * @returns An object with the calculated height and width of the applicaiton.
 */
function calculateAppDimensions()
{
	let height = window.innerHeight;
	let width = window.innerWidth;

	if(height > 720) height = 720;
	if(height < 480) height = 480;
	if(width > 1280) width = 1280;
	if(width < 800) width = 800;

	return {height, width};
}

/**
 * Updates the application height and width in the variables of the CSS :root element first defined in index.scss.
 */
function updateAppDimensions()
{
	const {height: newHeight, width: newWidth} = calculateAppDimensions();
	
	document.documentElement.style.setProperty('--app-height', `${newHeight}px`);
	document.documentElement.style.setProperty('--app-width', `${newWidth}px`);
}

function App()
{
	const [currentData, setCurrentData] = useState(currentDataDefault);
	const [countdown, setCountdown] = useState("");
	const [targetString, setTargetString] = useState("");
	const [txHistory, setTxHistory] = useState(Array(50).fill({blockNumber: 0, cyclesConsumed: 0, txCount: 0}) as Array<HistoryState>);

	// Update the dimension of the app and create an event listener to continue updating if the window size changes.
	useEffect(()=>{ window.addEventListener('resize', updateAppDimensions); updateAppDimensions(); }, []);

	// Update all data from the RPC immediately after first render. 
	useEffect(()=>{updateData(currentDataDefault, setCurrentData);}, []);

	// Update the data from the RPC, but omit the target time and target epoch to allow the countdown to track more smoothly without retargeting every few seconds as a block is found. Update the tx history data with current data pulled from the RPC.
	useInterval(()=>
	{
		updateData(currentData, setCurrentData, {updateTargets: false}); // Update all data except for the target data.
		updateTxHistoryData(currentData.historyState, txHistory, setTxHistory); // Update the tx history data with the new RPC data.
	}, REFRESH_DELAY);

	// Update the all data from the RPC including targets. This will cause the countdown to readjust, which is why the frequency is less often.
	useInterval(()=>{updateData(currentData, setCurrentData);}, FULL_REFRESH_DELAY);

	// Update the countdown and target string at the specified tick interval.
	useInterval(()=>
	{
		setCountdown(generateCountdown(currentData.targetTime));
		setTargetString(generateTargetString(currentData.targetEpoch, currentData.targetTime));
	}, TICK_DELAY);

	const html =
	(
		<div className="App w-[var(--app-width)] h-[var(--app-height)] m-auto bg-gray-800 relative overflow-hidden">
			<section className="w-[60px] p-[10px] min-h-[var(--app-height)] float-left bg-gray-700">
				<a href="https://github.com/jordanmack/nervos-ckb-node-dashboard" target="_blank" rel="noreferrer">
					<img src="nervos-logo-circle.png" className="w-[40px]" alt="Nervos Logo" />
				</a>
			</section>
			<section className="mx-auto ml-[61px] grid grid-cols-6 gap-px">
				{renderGridLarge("Block Number", currentData.block.toLocaleString())}
				{renderGridLarge("Epoch", currentData.epoch.toLocaleString(), currentData.epochIndex.toLocaleString()+"/"+currentData.epochLength.toLocaleString())}
				{renderGridLarge("Time to Halving", "", countdown)}
				{renderGridLarge("Next Halving Target", "", targetString)}
				{renderGridSmall("Pending TXs", currentData.pending.toLocaleString())}
				{renderGridSmall("Proposed TXs", currentData.proposed.toLocaleString())}
				{renderGridSmall("Orphan TXs", currentData.orphan.toLocaleString())}
				{renderGridSmall("Total TX Cycles", currentData.totalTxCycles.toLocaleString())}
				{renderGridSmall("Total TX Size", currentData.txSize.toLocaleString())}
				{renderGridSmall("Minimum Fee Rate", currentData.minFeeRate.toLocaleString())}
				{renderGridSmall("Connections", currentData.connections.toLocaleString())}
				{renderGridSmall("Chain Type", currentData.chainType)}
				{renderGridSmall("Node Version", currentData.nodeVersion.toLocaleString())}
				<div className="inline-block relative bg-gray-800 h-[calc(var(--app-height)*170/480)] col-span-6">
					{renderCharts(txHistory)}
				</div>
			</section>
			<footer className="text-center text-[0.65rem] pl-[61px] pb-1 absolute bottom-0 w-full text-slate-600">
				Nervos CKB Node Dashboard v{process.env.REACT_APP_VERSION}.
				{" "}
				Made by the Nervos Community.
				{" "}
				Source available on <a href="https://github.com/jordanmack/nervos-ckb-node-dashboard" target="_blank" rel="noreferrer">GitHub</a>.
			</footer>
		</div>
	);
	return html;
}

export default App;
