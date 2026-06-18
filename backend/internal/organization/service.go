package organization

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"
)

type Org struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

type Dept struct {
	ID        string    `json:"id"`
	OrgID     string    `json:"org_id"`
	Name      string    `json:"name"`
	UserCount int       `json:"user_count"`
	CreatedAt time.Time `json:"created_at"`
}

type User struct {
	ID        string    `json:"id"`
	OrgID     string    `json:"org_id"`
	DeptID    string    `json:"dept_id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	Password  string    `json:"password"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateOrgRequest struct{ Name string `json:"name"` }
type CreateDeptRequest struct{ OrgID string `json:"org_id"`; Name string `json:"name"` }
type CreateUserRequest struct {
	OrgID  string `json:"org_id"`
	DeptID string `json:"dept_id"`
	Name   string `json:"name"`
	Email  string `json:"email"`
	Role   string `json:"role"`
}

type Service struct {
	mu    sync.RWMutex
	orgs  map[string]*Org
	depts map[string]*Dept
	users map[string]*User
}

var globalService = &Service{
	orgs:  make(map[string]*Org),
	depts: make(map[string]*Dept),
	users: make(map[string]*User),
}

func GetService() *Service { return globalService }

func (s *Service) FindByEmail(email string) *User {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, u := range s.users {
		if u.Email == email {
			return u
		}
	}
	return nil
}

func init() {
	s := globalService

	orgID := uuid.New().String()
	s.orgs[orgID] = &Org{ID: orgID, Name: "AI应用与治理智能平台", CreatedAt: time.Now()}

	deptIDs := []string{}
	for _, name := range []string{"研发部", "产品部", "运营部", "数据部", "市场部"} {
		id := uuid.New().String()
		deptIDs = append(deptIDs, id)
		s.depts[id] = &Dept{ID: id, OrgID: orgID, Name: name, CreatedAt: time.Now()}
	}

	users := []struct{ name, email, role, deptID string }{
		{"张三", "zhangsan@example.com", "super_admin", deptIDs[0]},
		{"李四", "lisi@example.com", "dept_admin", deptIDs[1]},
		{"王五", "wangwu@example.com", "user", deptIDs[2]},
		{"赵六", "zhaoliu@example.com", "auditor", deptIDs[3]},
		{"数据分析Agent", "agent-data@example.com", "user", deptIDs[3]},
		{"代码审查Bot", "agent-code@example.com", "user", deptIDs[0]},
		{"客服Agent", "agent-service@example.com", "user", deptIDs[2]},
	}
	for _, u := range users {
		id := uuid.New().String()
		s.users[id] = &User{ID: id, OrgID: orgID, DeptID: u.deptID, Name: u.name, Email: u.email, Role: u.role, CreatedAt: time.Now()}
	}

	for _, d := range s.depts {
		count := 0
		for _, u := range s.users {
			if u.DeptID == d.ID { count++ }
		}
		d.UserCount = count
	}
}

func (s *Service) ListOrgs() []*Org {
	s.mu.RLock(); defer s.mu.RUnlock()
	list := make([]*Org, 0, len(s.orgs))
	for _, o := range s.orgs { list = append(list, o) }
	return list
}

func (s *Service) CreateOrg(req *CreateOrgRequest) *Org {
	s.mu.Lock(); defer s.mu.Unlock()
	id := uuid.New().String()
	o := &Org{ID: id, Name: req.Name, CreatedAt: time.Now()}
	s.orgs[id] = o
	return o
}

func (s *Service) DeleteOrg(id string) error {
	s.mu.Lock(); defer s.mu.Unlock()
	if _, ok := s.orgs[id]; !ok { return fmt.Errorf("not found") }
	delete(s.orgs, id)
	return nil
}

func (s *Service) ListDepts(orgID string) []*Dept {
	s.mu.RLock(); defer s.mu.RUnlock()
	list := make([]*Dept, 0)
	for _, d := range s.depts {
		if d.OrgID == orgID { list = append(list, d) }
	}
	sort.Slice(list, func(i, j int) bool { return list[i].CreatedAt.Before(list[j].CreatedAt) })
	return list
}

func (s *Service) CreateDept(req *CreateDeptRequest) *Dept {
	s.mu.Lock(); defer s.mu.Unlock()
	id := uuid.New().String()
	d := &Dept{ID: id, OrgID: req.OrgID, Name: req.Name, CreatedAt: time.Now()}
	s.depts[id] = d
	return d
}

func (s *Service) UpdateDept(id string, req *CreateDeptRequest) (*Dept, error) {
	s.mu.Lock(); defer s.mu.Unlock()
	d, ok := s.depts[id]
	if !ok { return nil, fmt.Errorf("not found") }
	if req.Name != "" { d.Name = req.Name }
	return d, nil
}

func (s *Service) DeleteDept(id string) error {
	s.mu.Lock(); defer s.mu.Unlock()
	if _, ok := s.depts[id]; !ok { return fmt.Errorf("not found") }
	delete(s.depts, id)
	return nil
}

func (s *Service) ListUsers(orgID, deptID string) []*User {
	s.mu.RLock(); defer s.mu.RUnlock()
	list := make([]*User, 0)
	for _, u := range s.users {
		if orgID != "" && u.OrgID != orgID { continue }
		if deptID != "" && u.DeptID != deptID { continue }
		list = append(list, u)
	}
	sort.Slice(list, func(i, j int) bool { return list[i].CreatedAt.Before(list[j].CreatedAt) })
	return list
}

func (s *Service) CreateUser(req *CreateUserRequest) *User {
	s.mu.Lock(); defer s.mu.Unlock()
	id := uuid.New().String()
	u := &User{ID: id, OrgID: req.OrgID, DeptID: req.DeptID, Name: req.Name, Email: req.Email, Role: req.Role, Password: genPassword(), CreatedAt: time.Now()}
	s.users[id] = u
	s.updateDeptCounts()
	return u
}

func (s *Service) ResetPassword(id string) (*User, error) {
	s.mu.Lock(); defer s.mu.Unlock()
	u, ok := s.users[id]
	if !ok { return nil, fmt.Errorf("not found") }
	u.Password = genPassword()
	return u, nil
}

func genPassword() string {
	b := make([]byte, 8)
	rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)[:10]
}

func (s *Service) DeleteUser(id string) error {
	s.mu.Lock(); defer s.mu.Unlock()
	if _, ok := s.users[id]; !ok { return fmt.Errorf("not found") }
	delete(s.users, id)
	s.updateDeptCounts()
	return nil
}

func (s *Service) UpdateUser(id string, req *CreateUserRequest) (*User, error) {
	s.mu.Lock(); defer s.mu.Unlock()
	u, ok := s.users[id]
	if !ok { return nil, fmt.Errorf("not found") }
	if req.Name != "" { u.Name = req.Name }
	if req.Email != "" { u.Email = req.Email }
	if req.Role != "" { u.Role = req.Role }
	if req.DeptID != "" { u.DeptID = req.DeptID }
	s.updateDeptCounts()
	return u, nil
}

func (s *Service) updateDeptCounts() {
	for _, d := range s.depts {
		count := 0
		for _, u := range s.users {
			if u.DeptID == d.ID { count++ }
		}
		d.UserCount = count
	}
}
