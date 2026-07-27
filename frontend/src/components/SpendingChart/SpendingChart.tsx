import { Cell, Label, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { CategorySummary } from '../../types'
import { formatCategoryName, formatCurrency } from '../../utils/formatters'

interface Props {
  categories: CategorySummary[]
}

const BOOTSTRAP_COLORS = [
  '#0d6efd',
  '#6f42c1',
  '#d63384',
  '#dc3545',
  '#fd7e14',
  '#ffc107',
  '#198754',
  '#20c997',
  '#0dcaf0',
  '#6610f2',
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
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-6">
        Spending by Category
      </h2>

      <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-10">
        <div className="w-full md:w-[55%] min-h-[300px] md:min-h-[340px]">
          <ResponsiveContainer width="100%" height={340}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={72}
                outerRadius={130}
                paddingAngle={2}
                stroke="transparent"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i]} />
                ))}
                <Label
                  value={formatCurrency(total)}
                  position="center"
                  dy={-10}
                  style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    fill: 'currentColor',
                    letterSpacing: '-0.02em',
                  }}
                />
                <Label
                  value="Total Spent"
                  position="center"
                  dy={14}
                  style={{
                    fontSize: '11px',
                    fill: 'currentColor',
                    fillOpacity: 0.55,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
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
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="w-full md:w-[45%] space-y-3.5" aria-label="Category breakdown">
          {data.map((row, index) => {
            const sharePercent = total > 0 ? (row.value / total) * 100 : 0
            const swatchColor = colors[index]

            return (
              <li key={row.name} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      aria-hidden
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: swatchColor }}
                    />
                    <span className="text-sm text-gray-800 dark:text-gray-100 truncate">
                      {row.name}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 shrink-0">
                    <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-50">
                      {formatCurrency(row.value)}
                    </span>
                    <span className="text-xs tabular-nums text-gray-400 dark:text-gray-500 w-10 text-right">
                      {sharePercent.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700/80 overflow-hidden ml-[18px]">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${Math.max(sharePercent, 1)}%`,
                      backgroundColor: swatchColor,
                    }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
