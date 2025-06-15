
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { noShowRiskData } from "@/lib/dummy-data";

const NoShowRiskCard = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No-Show Risk Forecast</CardTitle>
        <CardDescription>Predicted risk for the upcoming week</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart data={noShowRiskData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(value) => `${value}%`} />
                <Tooltip
                    cursor={{fill: 'hsl(var(--muted))', radius: 'var(--radius)'}}
                    contentStyle={{
                        background: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                    }}
                />
                <Bar dataKey="risk" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
            </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default NoShowRiskCard;
