import React, { useState } from 'react';
import { BarChart3, FileText, Users, DollarSign, Shield, Download, Calendar, Star } from 'lucide-react';

const ReportsView = () => {
  const [selectedReport, setSelectedReport] = useState('overview');

  const reportTypes = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'procurement', name: 'Procurement Analytics', icon: FileText },
    { id: 'supplier', name: 'Supplier Performance', icon: Users },
    { id: 'financial', name: 'Financial Reports', icon: DollarSign },
    { id: 'compliance', name: 'Compliance Reports', icon: Shield }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
        <div className="flex space-x-3">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Report Types</h3>
          <nav className="space-y-2">
            {reportTypes.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={`w-full flex items-center px-3 py-2 text-sm rounded-md ${
                  selectedReport === report.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <report.icon className="h-4 w-4 mr-3" />
                {report.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {selectedReport === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Tenders</p>
                      <p className="text-3xl font-bold text-gray-900">284</p>
                      <p className="text-sm text-green-600">+12% from last month</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Procurement Value</p>
                      <p className="text-3xl font-bold text-gray-900">ZMW 125M</p>
                      <p className="text-sm text-green-600">+8% from last month</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Active Suppliers</p>
                      <p className="text-3xl font-bold text-gray-900">1,247</p>
                      <p className="text-sm text-blue-600">+23 new this month</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Tender Status Distribution</h3>
                  <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Chart Component Placeholder</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Procurement Volume</h3>
                  <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Chart Component Placeholder</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedReport === 'procurement' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Procurement Analytics</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded p-4">
                    <h4 className="font-medium text-gray-900">Average Bid Count per Tender</h4>
                    <p className="text-2xl font-bold text-blue-600">6.8</p>
                  </div>
                  <div className="border border-gray-200 rounded p-4">
                    <h4 className="font-medium text-gray-900">Average Evaluation Time</h4>
                    <p className="text-2xl font-bold text-green-600">12.5 days</p>
                  </div>
                </div>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Procurement Trend Analysis Chart</p>
                </div>
              </div>
            </div>
          )}

          {selectedReport === 'supplier' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Supplier Performance</h3>
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bids Won</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Success Rate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance Score</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {[
                        { name: 'ABC Medical Ltd', won: 12, rate: '85%', score: 4.5 },
                        { name: 'BuildCorp Ltd', won: 8, rate: '72%', score: 4.2 },
                        { name: 'TechSolutions', won: 15, rate: '91%', score: 4.8 }
                      ].map((supplier, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{supplier.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.won}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.rate}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-yellow-400 mr-1" />
                              {supplier.score}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {selectedReport !== 'overview' && selectedReport !== 'procurement' && selectedReport !== 'supplier' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {reportTypes.find(r => r.id === selectedReport)?.name}
              </h3>
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Report content for {selectedReport} will be implemented here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
