"use client"

import type React from "react"
import { useState } from "react"
import * as XLSX from "xlsx"
import DataGrid from "react-data-grid"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Row = { [key: string]: string | number }

export default function ExcelViewer() {
  const [rows, setRows] = useState<Row[]>([])
  const [columns, setColumns] = useState<{ key: string; name: string }[]>([])
  const [url, setUrl] = useState("")

  const processExcelData = (data: ArrayBuffer) => {
    const workbook = XLSX.read(data, { type: "array" })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    if (jsonData.length > 0) {
      const cols = Object.keys(jsonData[0]).map((key) => ({ key, name: key }))
      setColumns(cols)
      setRows(jsonData as Row[])
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = e.target?.result as ArrayBuffer
        processExcelData(data)
      }
      reader.readAsArrayBuffer(file)
    }
  }

  const handleUrlSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      processExcelData(arrayBuffer)
    } catch (error) {
      console.error("Error fetching Excel file:", error)
      alert("Failed to fetch Excel file. Please check the URL and try again.")
    }
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="file" className="w-full">
        <TabsList>
          <TabsTrigger value="file">Upload File</TabsTrigger>
          <TabsTrigger value="url">Fetch from URL</TabsTrigger>
        </TabsList>
        <TabsContent value="file">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="excel-file">Upload Excel File</Label>
            <Input id="excel-file" type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
          </div>
        </TabsContent>
        <TabsContent value="url">
          <form onSubmit={handleUrlSubmit} className="flex items-center space-x-2">
            <Input
              type="url"
              placeholder="Enter Excel file URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <Button type="submit">Fetch</Button>
          </form>
        </TabsContent>
      </Tabs>

      {rows.length > 0 && (
        <div className="h-[600px]">
          <DataGrid columns={columns} rows={rows} />
        </div>
      )}
    </div>
  )
}

