import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export type EvolucaoChartRow = {
  data: string;
  peso: number | null;
  gordura: number | null;
  massa_magra: number | null;
  imc: number | null;
};

/**
 * Gráfico de tendência da evolução (recharts isolado).
 * Importado via React.lazy — o recharts (~110KB gz) só entra no bundle quando
 * a tela de evolução realmente renderiza o gráfico, e não no chunk da rota.
 */
export default function EvolucaoChart({ data }: { data: EvolucaoChartRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
        <CartesianGrid stroke="#2A2417" strokeDasharray="3 3" />
        <XAxis dataKey="data" stroke="#9A9A9A" fontSize={11} />
        <YAxis yAxisId="left" stroke="#D4AF37" fontSize={11} />
        <YAxis yAxisId="right" orientation="right" stroke="#F5D76E" fontSize={11} />
        <Tooltip contentStyle={{ background: "#161616", border: "1px solid #2A2417", borderRadius: 8, color: "#fff" }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line yAxisId="left" type="monotone" dataKey="peso" name="Peso (kg)" stroke="#D4AF37" strokeWidth={2.5} dot={{ r: 4 }} />
        <Line yAxisId="left" type="monotone" dataKey="massa_magra" name="Massa Magra (kg)" stroke="#34D399" strokeWidth={2} dot={{ r: 3 }} />
        <Line yAxisId="right" type="monotone" dataKey="gordura" name="% Gordura" stroke="#F87171" strokeWidth={2} dot={{ r: 3 }} />
        <Line yAxisId="right" type="monotone" dataKey="imc" name="IMC" stroke="#60A5FA" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 4" />
      </LineChart>
    </ResponsiveContainer>
  );
}
