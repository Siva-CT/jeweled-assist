import React from 'react';
import { User, Phone } from 'lucide-react';

const CustomersView = ({ customers }) => {
    return (
        <div className="flex-1 p-8 bg-gray-50 dark:bg-[#121212] overflow-y-auto">
            <h1 className="text-2xl font-bold mb-6 dark:text-white">Total Queries ({customers.length})</h1>

            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                        <tr>
                            <th className="p-4 font-medium text-gray-500 text-sm">Customer</th>
                            <th className="p-4 font-medium text-gray-500 text-sm">Last Contact</th>
                            <th className="p-4 font-medium text-gray-500 text-sm">Total Msg</th>
                            <th className="p-4 font-medium text-gray-500 text-sm">Last Interaction</th>
                            <th className="p-4 font-medium text-gray-500 text-sm">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {customers.map((cust) => (
                            <tr key={cust.customer} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                            <User size={16} />
                                        </div>
                                        <span className="font-medium dark:text-gray-200">{cust.customer}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-gray-500 text-sm">
                                    {new Date(cust.lastContact).toLocaleDateString()} {new Date(cust.lastContact).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="p-4 text-gray-500 text-sm">
                                    {cust.msgCount}
                                </td>
                                <td className="p-4 text-gray-400 text-xs italic truncate max-w-[200px]">
                                    "{cust.lastQuery.substring(0, 30)}..."
                                </td>
                                <td className="p-4">
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                        Active
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CustomersView;
