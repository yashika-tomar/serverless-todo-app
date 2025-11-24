import { useAuth0 } from '@auth0/auth0-react'
import dateFormat from 'dateformat'
import React, { useState } from 'react'
import { Divider, Grid, Input } from 'semantic-ui-react'
import { createTodo } from '../api/todos-api'

export function NewTodoInput({ onNewTodo, creating }) {
  const [newTodoName, setNewTodoName] = useState('')
  const { getAccessTokenSilently } = useAuth0()

  const onTodoCreate = async () => {
    if (!newTodoName.trim()) return alert("Todo name can't be empty")

    try {
      const token = await getAccessTokenSilently({
        audience: process.env.REACT_APP_AUTH0_AUDIENCE
      })

      const dueDate = calculateDueDate()

      const newTodo = await createTodo(token, {
        name: newTodoName,
        dueDate
      })

      setNewTodoName('') // clear input
      onNewTodo(newTodo)
    } catch (e) {
      console.log('Failed to create a new TODO', e)
      alert('Todo creation failed')
    }
  }

  return (
    <Grid.Row>
      <Grid.Column width={16}>
        <Input
          action={{
            color: 'teal',
            labelPosition: 'left',
            icon: 'add',
            content: creating ? 'Creating…' : 'New task',
            onClick: creating ? null : onTodoCreate,    // disable click
            disabled: creating                          // disable action button
          }}
          fluid
          actionPosition="left"
          placeholder="To change the world..."
          value={newTodoName}
          onChange={(e) => setNewTodoName(e.target.value)}
          disabled={creating}                           // disable input while creating
        />
      </Grid.Column>

      <Grid.Column width={16}>
        <Divider />
      </Grid.Column>
    </Grid.Row>
  )
}

function calculateDueDate() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return dateFormat(date, 'yyyy-mm-dd')
}
