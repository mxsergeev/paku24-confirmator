import React from 'react'

const Notification = ({ notification }) => {
    const notificationStyle = {
        whiteSpace: 'pre-wrap',
        opacity: 0.8,
        width: '50%',
        padding: 5,
        margin: 10,
        marginLeft: 0
    }
    const messageStyle = {
        color: 'grey', 
        fontSize: '1.1rem',
        backgroundColor: 'lightblue'
    }
    const errorStyle = {
        color: 'red', 
        fontSize: '1.1rem',
        backgroundColor: 'lightgrey',
        border: '2px solid red'
    }

    if (notification === null) return null

    return (
        <div style={ notification.error ? 
                {...notificationStyle, ...errorStyle} : 
                {...notificationStyle, ...messageStyle} 
            }>
            {notification.message}
        </div>
    )
}

export default Notification