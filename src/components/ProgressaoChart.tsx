import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export type ProgressaoChartRow = { data: string; carga: number };

/**
 * Gráfico de progressão de carga de um exercício (recharts isolado, mesmo
 * motivo do EvolucaoChart: só entra no bundle quando o histórico é aberto).
 */
export default function ProgressaoChart({ data }: { data: ProgressaoChartRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
        <CartesianGrid stroke="#2A2417" strokeDasharray="3 3" />
        <XAxis dataKey="data" stroke="#9A9A9A" fontSize={11} />
        <YAxis stroke="#D4AF37" fontSize={11} domain={["dataMin - 2", "dataMax + 2"]} />
        <Tooltip contentStyle={{ background: "#161616", border: "1px solid #2A2417", borderRadius: 8, color: "#fff" }} formatter={(v: number) => [`${v} kg`, "Carga máx."]} />
        <Line type="monotone" dataKey="carga" name="Carga (kg)" stroke="#D4AF37" strokeWidth={2.5} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
