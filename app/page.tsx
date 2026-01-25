"use client";

import { useEffect, useState } from "react";

interface StockCompany {
  id: number;
  company_name: string;
  company_code: string;
  company_akshare_code: string;
  industry: string | null;
  ipo_date: string | null;
  create_time: string;
  update_time: string;
}

interface ApiResponse {
  data: StockCompany[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function Home() {
  const [companies, setCompanies] = useState<StockCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/stock-companies?limit=10');
        
        if (!response.ok) {
          throw new Error('获取数据失败');
        }

        const result: ApiResponse = await response.json();
        setCompanies(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black p-8">
      <main className="w-full max-w-6xl">
        <h1 className="text-3xl font-bold mb-8 text-center text-zinc-900 dark:text-zinc-50">
          股票公司信息
        </h1>

        {loading && (
          <div className="text-center text-zinc-600 dark:text-zinc-400">
            加载中...
          </div>
        )}

        {error && (
          <div className="text-center text-red-600 dark:text-red-400">
            错误: {error}
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    代码
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    公司名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    行业
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    上市日期
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {company.company_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-700 dark:text-zinc-300">
                      {company.company_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
                      {company.industry || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
                      {company.ipo_date ? new Date(company.ipo_date).toLocaleDateString('zh-CN') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && companies.length === 0 && (
          <div className="text-center text-zinc-600 dark:text-zinc-400">
            暂无数据
          </div>
        )}
      </main>
    </div>
  );
}
