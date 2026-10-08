export type TxnType = "CREDIT" | "DEBIT";

export type TxnRow = {
	txnId: string;
	utr: string;
	date: string;
	time: string;
	amount: string;
	sentTo: string;
	type: TxnType;
	category: string;
};

export type StatementSource = "phonepe" | "gpay";
