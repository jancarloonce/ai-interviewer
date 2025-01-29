"use client"

import { useState } from "react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type ExcelData = {
  [key: string]: string | number
}[]

export default function ExcelReader() {
  const [excelData, setExcelData] = useState<ExcelData | null>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const bstr = event.target?.result
        const wb = XLSX.read(bstr, { type: "binary" })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws)
        setExcelData(data)
      }
      reader.readAsBinaryString(file)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
        <Button onClick={() => setExcelData(null)}>Clear</Button>
      </div>
      {excelData && (
        <Table>
          <TableHeader>
            <TableRow>
              {Object.keys(excelData[0]).map((key) => (
                <TableHead key={key}>{key}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {excelData.map((row, index) => (
              <TableRow key={index}>
                {Object.values(row).map((value, cellIndex) => (
                  <TableCell key={cellIndex}>{value as string}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

