import { Cell, Label, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { CategorySummary } from '../../types'
import { formatCategoryName, formatCurrency } from '../../utils/formatters'

interface Props {
  categories: CategorySummary[]
}

const BOOTSTRAP_COLORS = [
  '#0d6efd', // primary
  '#6f42c1', // purple
  '#d63384', // pink
  '#dc3545', // danger
  '#fd7e14', // orange
  '#ffc107', // warning
  '#198754', // success
  '#20c997', // teal
  '#0dcaf0', // cyan
  '#6610f2', // indigo
]

const hexToHsl = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

const generateColors = (count: number): string[] => {
  if (count <= 10) return BOOTSTRAP_COLORS.slice(0, count)

  const colors = [...BOOTSTRAP_COLORS]
  const extra = count - 10
  const step = 360 / (extra + 1)
  for (let i = 0; i < extra; i++) {
    const base = BOOTSTRAP_COLORS[i % BOOTSTRAP_COLORS.length]
    const [h, s, l] = hexToHsl(base)
    const newHue = (h + step * (i + 1)) % 360
    colors.push(`hsl(${newHue}, ${s}%, ${l}%)`)
  }
  return colors
}

export const SpendingChart = ({ categories }: Props) => {
  const data = categories.map((c) => ({ name: formatCategoryName(c.category), value: c.total_amount }))
  const colors = generateColors(categories.length)
  const total = categories.reduce((sum, c) => sum + c.total_amount, 0)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-gray-900 dark:text-gray-50">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
        Spending by Category
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i]} />
            ))}
            <Label
              value={formatCurrency(total)}
              position="center"
              dy={-10}
              style={{ fontSize: '22px', fontWeight: 700, fill: 'currentColor', letterSpacing: '-0.02em' }}
            />
            <Label
              value="Total Spent"
              position="center"
              dy={14}
              style={{ fontSize: '11px', fill: 'currentColor', fillOpacity: 0.55, letterSpacing: '0.08em', textTransform: 'uppercase' }}
            />
          </Pie>
          <Tooltip
            formatter={(currencyValue) =>
              formatCurrency(
                typeof currencyValue === 'number'
                  ? currencyValue
                  : Number(currencyValue ?? 0)
              )
            }
            contentStyle={{
              borderRadius: 16,
              border: '1px solid rgb(229 231 235)',
              boxShadow: '0 12px 30px rgb(76 73 239 / 0.15)',
              background: 'rgba(255,255,255,0.98)',
              color: '#0f172a',
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            layout="vertical"
            wrapperStyle={{ fontSize: '12px', paddingLeft: '16px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
