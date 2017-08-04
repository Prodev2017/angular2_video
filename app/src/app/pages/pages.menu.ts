export const EDITOR_MENU = [
  {
    path: 'pages',
    children: [
      {
        path: 'service-selector',
        data: {
          menu: {
            icon: 'ion-android-list',
            selected: false,
            expanded: true,
            order: 0
          }
        },
        children: [],
        showEditors: true,
        showMembers:true
      }
    ]
  }
];

export const PAGES_MENU = [
  {
    path: 'pages',
    children: [
      {
        path: 'service-selector',
        data: {
          menu: {
            icon: 'ion-android-list',
            selected: false,
            expanded: true,
            order: 0
          }
        },
        children: []
      },
      {
        path: 'tracks',
        data: {
          menu: {
            title: 'Track List',
            icon: 'ion-android-list',
            selected: false,
            expanded: false,
            order: 50
          }
        },
        children: []
      },
      {
        path: 'top-editors',
        data: {
          menu: {
            title: 'Top Editors',
            icon: 'ion-edit',
            selected: false,
            expanded: false,
            order: 100,
          }
        },
        children: []
      },
      {
        path: 'top-collections',
        data: {
          menu: {
            title: 'Top Collections',
            icon: 'ion-edit',
            selected: false,
            expanded: false,
            order: 200,
          }
        },
        children: []
      },
      {
        path: 'editors',
        data: {
          menu: {
            title: 'Editors',
            icon: 'ion-edit',
            selected: false,
            expanded: false,
            order: 300,
          }
        },
        children: [
          {
            path: 'uploader',
            data: {
              menu: {
                title: 'Uploader',
              }
            }
          },
                    {
            path: 'profile',
            data: {
              menu: {
                title: 'Edit Profile',
              }
            }
          }
        ]
      }
    ]
  }
];
