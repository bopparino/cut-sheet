import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QtyGrid } from "@/components/cutsheet/QtyGrid";
import { DUCT60_SIZES, type Duct60Size } from "@/lib/schema";

const labelDuct60 = (size: Duct60Size) => {
  if (size.startsWith("3.25")) return `3 1/4 x ${size.slice(5)}`;
  return size;
};

export function Duct60Section({ values }: { values: Record<Duct60Size, number> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>60&quot; Duct</CardTitle>
      </CardHeader>
      <CardContent>
        <QtyGrid prefix="duct60" sizes={DUCT60_SIZES} values={values} formatLabel={labelDuct60} />
      </CardContent>
    </Card>
  );
}
