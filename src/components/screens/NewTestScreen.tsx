import React, {useState} from 'react'
import {H1, FormGroup, InputGroup, Button, ButtonGroup, Intent} from '@blueprintjs/core'
import {useSelector, useDispatch} from 'react-redux'

import {exercisesSelector} from '../../redux/selectors'
import {addExercise} from '../../redux/reducers/creator'
import {generateIdentifier} from '../../utils/common'
import {buildAnswer, buildAssignment} from '../../utils/exercises'
import {useCollection} from '../../hooks/database'
import {Collections} from '../../types'

import Exercise from '../exercises/Exercise'
import Toaster from '../common/Toaster'
import Working from '../common/Working'

import './NewTestScreen.scss'

const NewTestScreen = () => {
  const dispatch = useDispatch()
  const exercises = useSelector(exercisesSelector)
  const [title, setTitle] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [working, setWorking] = useState(false)
  const testsCollection = useCollection(Collections.Tests)
  const correctAnswersCollection = useCollection(Collections.CorrectAnswers)

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value)
  }

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value)
  }

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value)
  }

  const add = () => {
    dispatch(addExercise())
  }

  const build = async () => {
    setWorking(true)

    const testDocument = {
      title,
      name,
      email,
      resultsId: generateIdentifier(),
    }

    const exerciseDocuments = exercises.map((exercise) => ({
      type: exercise.type,
      description: exercise.description,
      assignment: buildAssignment(exercise),
    }))

    const answers = exercises.map((exercise) => buildAnswer(exercise))

    // TODO: Run as a transaction
    try {
      const testDocumentRef = await testsCollection.add(testDocument)
      const exerciseDocumentIds: Array<string> = []

      for (let i = 0; i < exerciseDocuments.length; i++) {
        exerciseDocumentIds.push(
          (await testDocumentRef.collection(Collections.Exercises).add({order: i, ...exerciseDocuments[i]})).id,
        )
      }

      for (let i = 0; i < answers.length; i++) {
        const answer = answers[i]
        answer && correctAnswersCollection.doc(exerciseDocumentIds[i]).set({answer})
      }
    } catch (error) {
      console.error(error)
      Toaster.show({
        intent: Intent.DANGER,
        message: `A problem occured during the test creation. Please, try again later. Error: ${error}`,
      })
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="new-test">
      <H1>New Test</H1>
      {/* TODO: Form vaidation */}
      {/* TODO: Form validation for exercise inputs */}
      <div className="form-area">
        <FormGroup label="Title:" labelFor="title-input" inline>
          <InputGroup id="title-input" value={title} onChange={handleTitleChange} />
        </FormGroup>
        <FormGroup label="Name:" labelFor="name-input" inline>
          <InputGroup id="name-input" value={name} onChange={handleNameChange} />
        </FormGroup>
        <FormGroup label="Email:" labelFor="email-input" inline>
          <InputGroup id="email-input" value={email} onChange={handleEmailChange} />
        </FormGroup>
      </div>
      <div className="exercises">
        {exercises.map((exercise, index) => (
          <Exercise key={index} index={index} type={exercise.type} description={exercise.description} />
        ))}
        <ButtonGroup className="add-exercise" onClick={add}>
          <Button large intent="primary" icon="add" text="Add exercise" />
        </ButtonGroup>
      </div>
      <ButtonGroup className="build-test" onClick={build}>
        <Button large intent="success" icon="build" text="Build test" />
      </ButtonGroup>
      <Working show={working} />
    </div>
  )
}

export default NewTestScreen
