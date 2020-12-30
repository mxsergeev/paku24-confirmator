import React, { useState, useEffect } from 'react' 
import { useHistory, useLocation, useRouteMatch, Route } from 'react-router-dom'
import Modal from '@material-ui/core/Modal'
import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField'

export default function InputModal(props) {
  // value === phoneNumber || email
  const { value, label, name, handleChange } = props
  const [modalOpen, setModalOpen] = useState(false)

  let history = useHistory()
  let location = useLocation()


  // this operation gets called two times per render. Fix this!
  let url = useRouteMatch('/:type')?.url

  console.log('match', url)

  const slug = label.toLowerCase()

  useEffect(() => {
    if (location.pathname === `${url}/${slug}`) return setModalOpen(true) 
    return setModalOpen(false)
  }, [location.pathname, slug, url])

  
  const handleModalOpen = () => {
    setModalOpen(true)
    history.push(url ? `${url}/${slug}` : `/edit/${slug}`)
  }
  
  const handleModalClose = () => {
    setModalOpen(false)
    history.push(url === '/edit' ? '/' : url)
  }
  
  const modalStyle = {
    position: 'absolute',
    maxWidth: 500,
    minWidth: 300,
    padding: 20,
    backgroundColor: 'white',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)'
  }

  return (
    <>
      <Button className="button-info" variant="outlined" onClick={handleModalOpen}>
        {label} to: {value}
      </Button>
      <Route path={[`${url}/${slug}`, `${url}/${slug}`]}>
        <Modal
          open={modalOpen}
          onClose={handleModalClose}
        >
          <div style={modalStyle}>
            <TextField 
              label={label}
              name={name} 
              variant="outlined" 
              onChange={handleChange} 
              value={value} 
              type={label === 'Email' ? label : ''}
              autoFocus
            />
          </div>
        </Modal>
      </Route>
    </>
  )
}