import { useEffect, useState } from 'react'
import { Cell, Column, Input, NumberField, Row, Table, TableBody, TableHeader } from 'react-aria-components'

export function App({ serverUserAgent }) {
  const [clientUserAgent, setClientUserAgent] = useState(null)
  useEffect(() => {
    setClientUserAgent(`${navigator.userAgent} | platform: ${navigator.userAgentData?.platform || navigator.platform}`)
  }, [])

  return (
    <main>
      <p>Server rendered with: <code>{serverUserAgent || '(no user agent header)'}</code></p>
      <p>Client hydrated with: <code>{clientUserAgent ?? 'hydrating...'}</code></p>

      <Table aria-label="Sortable table" sortDescriptor={{ column: 'name', direction: 'descending' }}>
        <TableHeader>
          <Column id="name" isRowHeader allowsSorting>Name</Column>
          <Column id="age" allowsSorting>Age</Column>
        </TableHeader>
        <TableBody>
          <Row id={1}><Cell>Ada</Cell><Cell>36</Cell></Row>
        </TableBody>
      </Table>

      <NumberField aria-label="Amount" formatOptions={{ maximumFractionDigits: 2 }}>
        <Input />
      </NumberField>
    </main>
  )
}
